import { Router, type IRouter, type RequestHandler } from "express";
import multer from "multer";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const pdfParseModule = require("pdf-parse") as {
  default?: (buffer: Buffer) => Promise<{ text?: string }>;
  PDFParse?: new (options: { data: Buffer }) => {
    getText: () => Promise<{ text?: string }>;
    destroy?: () => Promise<void> | void;
  };
};
import { db, analysesTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";
import { logger } from "../lib/logger";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

type ResumeUploadErrorCode =
  | "resume_file_too_large"
  | "resume_upload_unexpected_field"
  | "resume_upload_malformed"
  | "resume_upload_error";

const RESUME_UPLOAD_ERROR_MESSAGES: Record<ResumeUploadErrorCode, string> = {
  resume_file_too_large: "Resume file is too large. Maximum allowed size is 10MB.",
  resume_upload_unexpected_field: "Resume upload field is invalid. Please upload the file using the 'resume' field.",
  resume_upload_malformed: "Resume upload payload is malformed. Please re-upload and try again.",
  resume_upload_error: "Resume upload failed. Please try again.",
};

function mapResumeUploadError(err: unknown): { code: ResumeUploadErrorCode; message: string } {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return { code: "resume_file_too_large", message: RESUME_UPLOAD_ERROR_MESSAGES.resume_file_too_large };
    }
    if (err.code === "LIMIT_UNEXPECTED_FILE") {
      return { code: "resume_upload_unexpected_field", message: RESUME_UPLOAD_ERROR_MESSAGES.resume_upload_unexpected_field };
    }
    return { code: "resume_upload_malformed", message: RESUME_UPLOAD_ERROR_MESSAGES.resume_upload_malformed };
  }
  return { code: "resume_upload_error", message: RESUME_UPLOAD_ERROR_MESSAGES.resume_upload_error };
}

const uploadResumeMiddleware: RequestHandler = (req, res, next) => {
  upload.single("resume")(req, res, (err?: unknown) => {
    if (!err) {
      next();
      return;
    }

    const mapped = mapResumeUploadError(err);
    logger.warn(
      {
        err,
        code: mapped.code,
        requestId: (req as unknown as { id?: unknown }).id,
        userId: req.user?.id,
        contentType: req.headers["content-type"],
      },
      "Rejecting analysis request due to resume upload failure",
    );
    res.status(400).json({ error: mapped.message, code: mapped.code });
  });
};

function normalizeResumeText(raw: string): string {
  return raw.replace(/\u0000/g, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
}

type ResumeExtractionCode =
  | "ok"
  | "no_resume_file"
  | "empty_buffer"
  | "plain_text_empty"
  | "not_pdf_binary"
  | "pdf_no_extractable_text"
  | "pdf_encrypted"
  | "pdf_parse_error";

type ResumeExtraction = { ok: boolean; code: ResumeExtractionCode; message: string };

const RESUME_EXTRACTION_MESSAGES: Record<ResumeExtractionCode, string> = {
  ok: "Resume text extracted successfully.",
  no_resume_file: "No resume file was uploaded. Only the job description will be used.",
  empty_buffer: "The uploaded file is empty.",
  plain_text_empty: "The text file has no readable content.",
  not_pdf_binary:
    "This file does not look like a valid PDF. Export or save as PDF and try again, or upload a plain text (.txt) resume.",
  pdf_no_extractable_text:
    "No text could be extracted from this PDF (for example, scanned pages without OCR). Analysis will continue with limited resume information.",
  pdf_encrypted: "This PDF appears to be password-protected. Remove the password and upload again for accurate matching.",
  pdf_parse_error: "This PDF could not be read (it may be damaged or not a real PDF). Try exporting again or use another format.",
};

function pdfScanStart(buf: Buffer): number {
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) return 3;
  return 0;
}

function bufferLooksLikePdf(buf: Buffer): boolean {
  const start = pdfScanStart(buf);
  const limit = Math.min(buf.length, start + 4096);
  for (let i = start; i <= limit - 5; i++) {
    if (
      buf[i] === 0x25 &&
      buf[i + 1] === 0x50 &&
      buf[i + 2] === 0x44 &&
      buf[i + 3] === 0x46 &&
      buf[i + 4] === 0x2d
    ) {
      return true;
    }
  }
  return false;
}

function classifyPdfParseError(err: unknown): "pdf_encrypted" | "pdf_parse_error" {
  const msg = err instanceof Error ? err.message : String(err);
  if (/(password|encrypt|cipher|decrypt|owner)/i.test(msg)) return "pdf_encrypted";
  return "pdf_parse_error";
}

function extraction(code: ResumeExtractionCode): ResumeExtraction {
  return {
    ok: code === "ok",
    code,
    message: RESUME_EXTRACTION_MESSAGES[code],
  };
}

async function parsePdfText(buffer: Buffer): Promise<string> {
  const legacyParse = typeof pdfParseModule === "function" ? pdfParseModule : pdfParseModule.default;
  if (typeof legacyParse === "function") {
    const parsed = await legacyParse(buffer);
    return typeof parsed?.text === "string" ? parsed.text : "";
  }

  if (typeof pdfParseModule.PDFParse === "function") {
    const parser = new pdfParseModule.PDFParse({ data: buffer });
    try {
      const parsed = await parser.getText();
      return typeof parsed?.text === "string" ? parsed.text : "";
    } finally {
      await parser.destroy?.();
    }
  }

  throw new TypeError("Unsupported pdf-parse module API");
}

/**
 * Detects resume format issues before/while parsing; never throws.
 * Always returns text (possibly empty) plus a client-displayable extraction report.
 */
async function extractResumeTextFromUpload(
  file: Express.Multer.File | undefined,
): Promise<{ text: string; extraction: ResumeExtraction }> {
  if (!file) {
    return { text: "", extraction: extraction("no_resume_file") };
  }

  if (!file.buffer?.length) {
    logger.warn({ originalname: file.originalname, mimetype: file.mimetype }, "Resume upload has empty buffer");
    return { text: "", extraction: extraction("empty_buffer") };
  }

  const mime = (file.mimetype || "").toLowerCase();
  const name = (file.originalname || "").toLowerCase();
  const treatAsPlainText =
    mime === "text/plain" ||
    mime === "text/markdown" ||
    name.endsWith(".txt") ||
    name.endsWith(".md");

  if (treatAsPlainText) {
    const text = normalizeResumeText(file.buffer.toString("utf8"));
    if (!text) {
      logger.warn({ originalname: file.originalname, mimetype: file.mimetype }, "Plain-text resume decoded to empty string");
      return { text: "", extraction: extraction("plain_text_empty") };
    }
    return { text, extraction: extraction("ok") };
  }

  if (!bufferLooksLikePdf(file.buffer)) {
    logger.warn(
      { originalname: file.originalname, mimetype: file.mimetype, size: file.size },
      "Resume buffer missing %PDF- signature; skipping pdf-parse",
    );
    return { text: "", extraction: extraction("not_pdf_binary") };
  }

  try {
    const normalized = normalizeResumeText(await parsePdfText(file.buffer));
    if (!normalized) {
      logger.warn(
        { originalname: file.originalname, mimetype: file.mimetype, size: file.size },
        "PDF parsed but no extractable text (e.g. scanned image-only)",
      );
      return { text: "", extraction: extraction("pdf_no_extractable_text") };
    }
    return { text: normalized, extraction: extraction("ok") };
  } catch (err) {
    const sub = classifyPdfParseError(err);
    logger.warn(
      { err, originalname: file.originalname, mimetype: file.mimetype, size: file.size },
      "Resume PDF text extraction failed",
    );
    return { text: "", extraction: extraction(sub) };
  }
}

const WORKFLOW_STEPS = [
  "Extracting resume text",
  "Parsing resume profile",
  "Parsing job description",
  "Matching resume to JD",
  "Generating recommendations",
];

async function updateAnalysis(id: number, data: Partial<typeof analysesTable.$inferInsert>) {
  await db
    .update(analysesTable)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(analysesTable.id, id));
}

async function runWorkflow(analysisId: number, resumeText: string, jobDescription: string) {
  let currentStep: string | null = WORKFLOW_STEPS[0];
  let currentStepIndex = 0;
  try {
    currentStep = WORKFLOW_STEPS[0];
    currentStepIndex = 0;
    await updateAnalysis(analysisId, {
      status: "processing",
      currentStep: WORKFLOW_STEPS[0],
      stepIndex: 0,
      totalSteps: WORKFLOW_STEPS.length,
    });

    // Step 1: Extract is already done (resumeText passed in)
    // Step 2: Parse resume
    currentStep = WORKFLOW_STEPS[1];
    currentStepIndex = 1;
    await updateAnalysis(analysisId, { currentStep: WORKFLOW_STEPS[1], stepIndex: 1 });

    const resumeParseResp = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 8192,
      messages: [
        {
          role: "system",
          content: `You are a professional resume parser. Extract and summarize the candidate's profile from the resume text.
Return ONLY valid JSON with this structure:
{
  "summary": "2-3 sentence summary of the candidate",
  "skills": ["skill1", "skill2"],
  "experience_years": number or null,
  "domains": ["domain1"],
  "education": "highest degree summary"
}`,
        },
        { role: "user", content: `Resume text:\n${resumeText.slice(0, 6000)}` },
      ],
    });

    let resumeProfile: { summary: string; skills: string[]; experience_years: number | null; domains: string[]; education: string } = {
      summary: "",
      skills: [],
      experience_years: null,
      domains: [],
      education: "",
    };
    try {
      const content = resumeParseResp.choices[0]?.message?.content ?? "{}";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) resumeProfile = JSON.parse(jsonMatch[0]);
    } catch { /* ignore parse errors */ }

    // Step 3: Parse JD
    currentStep = WORKFLOW_STEPS[2];
    currentStepIndex = 2;
    await updateAnalysis(analysisId, { currentStep: WORKFLOW_STEPS[2], stepIndex: 2 });

    const jdParseResp = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 8192,
      messages: [
        {
          role: "system",
          content: `You are a job description analyst. Parse the job description and extract key requirements.
Return ONLY valid JSON with this structure:
{
  "summary": "2-3 sentence summary of the role",
  "required_skills": ["skill1", "skill2"],
  "preferred_skills": ["skill1"],
  "experience_required": "X years in Y",
  "domain": "industry/domain",
  "key_responsibilities": ["responsibility1"]
}`,
        },
        { role: "user", content: `Job description:\n${jobDescription.slice(0, 6000)}` },
      ],
    });

    let jdProfile: { summary: string; required_skills: string[]; preferred_skills: string[]; experience_required: string; domain: string; key_responsibilities: string[] } = {
      summary: "",
      required_skills: [],
      preferred_skills: [],
      experience_required: "",
      domain: "",
      key_responsibilities: [],
    };
    try {
      const content = jdParseResp.choices[0]?.message?.content ?? "{}";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) jdProfile = JSON.parse(jsonMatch[0]);
    } catch { /* ignore parse errors */ }

    // Step 4: Match
    currentStep = WORKFLOW_STEPS[3];
    currentStepIndex = 3;
    await updateAnalysis(analysisId, { currentStep: WORKFLOW_STEPS[3], stepIndex: 3 });

    const matchResp = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 8192,
      messages: [
        {
          role: "system",
          content: `You are a senior technical recruiter. Analyze how well this candidate matches the job requirements.
Return ONLY valid JSON with this structure:
{
  "match_score": number between 0-100,
  "decision_hint": "Strong Fit" | "Good Fit" | "Moderate Fit" | "Needs Review" | "Weak Fit",
  "strengths": [{"skill": "string", "description": "string"}],
  "gaps": [{"skill": "string", "description": "string", "severity": "low"|"medium"|"high"}],
  "missing_keywords": ["keyword1", "keyword2"],
  "interview_focus_areas": ["area1", "area2"]
}`,
        },
        {
          role: "user",
          content: `Candidate profile:\n${JSON.stringify(resumeProfile, null, 2)}\n\nJob requirements:\n${JSON.stringify(jdProfile, null, 2)}`,
        },
      ],
    });

    let matchResult: {
      match_score: number;
      decision_hint: string;
      strengths: { skill: string; description: string }[];
      gaps: { skill: string; description: string; severity: string }[];
      missing_keywords: string[];
      interview_focus_areas: string[];
    } = {
      match_score: 0,
      decision_hint: "Needs Review",
      strengths: [],
      gaps: [],
      missing_keywords: [],
      interview_focus_areas: [],
    };
    try {
      const content = matchResp.choices[0]?.message?.content ?? "{}";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) matchResult = JSON.parse(jsonMatch[0]);
    } catch { /* ignore parse errors */ }

    // Step 5: Recommendations
    currentStep = WORKFLOW_STEPS[4];
    currentStepIndex = 4;
    await updateAnalysis(analysisId, { currentStep: WORKFLOW_STEPS[4], stepIndex: 4 });

    const recoResp = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 8192,
      messages: [
        {
          role: "system",
          content: `You are a career coach. Based on the match analysis, provide actionable recommendations.
Return ONLY valid JSON with this structure:
{
  "recommendations": [
    {"type": "resume_rewrite", "content": "string"},
    {"type": "keyword", "content": "string"},
    {"type": "interview_prep", "content": "string"},
    {"type": "pitch", "content": "string"}
  ]
}`,
        },
        {
          role: "user",
          content: `Match analysis:\n${JSON.stringify(matchResult, null, 2)}\n\nCandidate:\n${resumeProfile.summary}\n\nRole:\n${jdProfile.summary}`,
        },
      ],
    });

    let recoResult: { recommendations: { type: string; content: string }[] } = { recommendations: [] };
    try {
      const content = recoResp.choices[0]?.message?.content ?? "{}";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) recoResult = JSON.parse(jsonMatch[0]);
    } catch { /* ignore parse errors */ }

    // Save final results
    await updateAnalysis(analysisId, {
      status: "completed",
      currentStep: null,
      resumeSummary: resumeProfile.summary,
      jdSummary: jdProfile.summary,
      matchScore: matchResult.match_score,
      decisionHint: matchResult.decision_hint,
      strengths: matchResult.strengths,
      gaps: matchResult.gaps,
      missingKeywords: matchResult.missing_keywords,
      interviewFocusAreas: matchResult.interview_focus_areas,
      recommendations: recoResult.recommendations,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const errorMessage = message.length > 2000 ? message.slice(0, 2000) : message;
    logger.error(
      {
        err,
        analysisId,
        currentStep,
        currentStepIndex,
        resumeTextLength: resumeText.length,
        jobDescriptionLength: jobDescription.length,
      },
      "Analysis workflow failed",
    );
    await updateAnalysis(analysisId, {
      status: "failed",
      error: errorMessage,
      currentStep: null,
    });
  }
}

// List analyses
router.get("/analyses", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const analyses = await db
    .select({
      id: analysesTable.id,
      userId: analysesTable.userId,
      jobTitle: analysesTable.jobTitle,
      companyName: analysesTable.companyName,
      status: analysesTable.status,
      matchScore: analysesTable.matchScore,
      decisionHint: analysesTable.decisionHint,
      createdAt: analysesTable.createdAt,
      updatedAt: analysesTable.updatedAt,
    })
    .from(analysesTable)
    .where(eq(analysesTable.userId, req.user.id))
    .orderBy(desc(analysesTable.createdAt));

  res.json({ analyses });
});

// Create analysis
router.post("/analyses", uploadResumeMiddleware, async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { jobDescription, jobTitle, companyName } = req.body as { jobDescription: string; jobTitle?: string; companyName?: string };
  if (!jobDescription) {
    res.status(400).json({ error: "jobDescription is required" });
    return;
  }

  const { text: resumeText, extraction: resumeExtraction } = await extractResumeTextFromUpload(req.file);
  const shouldBlockForResumeExtractionError = !!req.file && resumeExtraction.code !== "ok";
  if (shouldBlockForResumeExtractionError) {
    logger.warn(
      {
        code: resumeExtraction.code,
        message: resumeExtraction.message,
        requestId: (req as unknown as { id?: unknown }).id,
        userId: req.user.id,
        filename: req.file?.originalname,
        mimetype: req.file?.mimetype,
        size: req.file?.size,
      },
      "Rejecting analysis request due to resume extraction failure",
    );
    res.status(400).json({ error: resumeExtraction.message, code: resumeExtraction.code });
    return;
  }

  const [analysis] = await db.insert(analysesTable).values({
    userId: req.user.id,
    jobTitle: jobTitle || null,
    companyName: companyName || null,
    jobDescription,
    resumeText,
    status: "pending",
  }).returning();

  // Run the workflow async (non-blocking)
  runWorkflow(analysis.id, resumeText, jobDescription).catch(() => {/* already handled inside */});

  res.status(202).json({
    id: analysis.id,
    userId: analysis.userId,
    jobTitle: analysis.jobTitle,
    companyName: analysis.companyName,
    status: analysis.status,
    matchScore: analysis.matchScore,
    decisionHint: analysis.decisionHint,
    createdAt: analysis.createdAt,
    updatedAt: analysis.updatedAt,
    resumeExtraction,
  });
});

// Get analysis
router.get("/analyses/:id", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const id = parseInt(req.params.id ?? "");
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  const [analysis] = await db.select().from(analysesTable).where(
    and(eq(analysesTable.id, id), eq(analysesTable.userId, req.user.id))
  );
  if (!analysis) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(analysis);
});

// Get analysis status
router.get("/analyses/:id/status", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const id = parseInt(req.params.id ?? "");
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  const [analysis] = await db.select({
    id: analysesTable.id,
    status: analysesTable.status,
    currentStep: analysesTable.currentStep,
    stepIndex: analysesTable.stepIndex,
    totalSteps: analysesTable.totalSteps,
    error: analysesTable.error,
  }).from(analysesTable).where(
    and(eq(analysesTable.id, id), eq(analysesTable.userId, req.user.id))
  );
  if (!analysis) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(analysis);
});

// Delete analysis
router.delete("/analyses/:id", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const id = parseInt(req.params.id ?? "");
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  const [existing] = await db.select({ id: analysesTable.id }).from(analysesTable).where(
    and(eq(analysesTable.id, id), eq(analysesTable.userId, req.user.id))
  );
  if (!existing) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  await db.delete(analysesTable).where(eq(analysesTable.id, id));
  res.json({ success: true });
});

export default router;
