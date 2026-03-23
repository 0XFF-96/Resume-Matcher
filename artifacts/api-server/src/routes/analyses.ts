import { Router, type IRouter } from "express";
import multer from "multer";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse") as (buffer: Buffer) => Promise<{ text: string }>;
import { db, analysesTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const WORKFLOW_STEPS = [
  "Extracting resume text",
  "Parsing resume profile",
  "Parsing job description",
  "Matching resume to JD",
  "Generating recommendations",
];

async function updateAnalysis(id: number, data: Record<string, unknown>) {
  await db.update(analysesTable).set({ ...data, updatedAt: new Date() } as Parameters<typeof analysesTable.$inferInsert>[0]).where(eq(analysesTable.id, id));
}

async function runWorkflow(analysisId: number, resumeText: string, jobDescription: string) {
  try {
    await updateAnalysis(analysisId, {
      status: "processing",
      currentStep: WORKFLOW_STEPS[0],
      stepIndex: 0,
      totalSteps: WORKFLOW_STEPS.length,
    });

    // Step 1: Extract is already done (resumeText passed in)
    // Step 2: Parse resume
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
    await updateAnalysis(analysisId, {
      status: "failed",
      error: message,
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
router.post("/analyses", upload.single("resume"), async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { jobDescription, jobTitle, companyName } = req.body as { jobDescription: string; jobTitle?: string; companyName?: string };
  if (!jobDescription) {
    res.status(400).json({ error: "jobDescription is required" });
    return;
  }

  let resumeText = "";
  if (req.file) {
    try {
      const data = await pdfParse(req.file.buffer);
      resumeText = data.text;
    } catch {
      res.status(400).json({ error: "Failed to parse PDF. Please ensure it is a valid PDF file." });
      return;
    }
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
