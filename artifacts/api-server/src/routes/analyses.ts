import { Router, type IRouter } from "express";
import { db, analysesTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { logger } from "../lib/logger";
import { uploadResumeMiddleware } from "./analyses/upload";
import { extractResumeTextFromUpload } from "./analyses/resumeExtraction";
import { runWorkflow } from "./analyses/workflow";

const router: IRouter = Router();

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
