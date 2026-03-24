import { integer, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./auth";

export const ANALYSIS_STATUSES = ["pending", "processing", "completed", "failed"] as const;
export const analysisStatusSchema = z.enum(ANALYSIS_STATUSES);
export type AnalysisStatus = (typeof ANALYSIS_STATUSES)[number];

const analysisInsightSchema = z.object({
  title: z.string().min(1),
  detail: z.string().min(1).optional(),
  score: z.number().int().min(0).max(100).optional(),
});

const analysisInsightListSchema = z.array(z.union([z.string().min(1), analysisInsightSchema]));

export type AnalysisInsight = z.infer<typeof analysisInsightSchema>;
export type AnalysisInsightList = z.infer<typeof analysisInsightListSchema>;

export const analysesTable = pgTable("analyses", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id),
  jobTitle: text("job_title"),
  companyName: text("company_name"),
  jobDescription: text("job_description").notNull(),
  resumeText: text("resume_text"),
  status: text("status").notNull().default("pending").$type<AnalysisStatus>(),
  currentStep: text("current_step"),
  stepIndex: integer("step_index"),
  totalSteps: integer("total_steps"),
  resumeSummary: text("resume_summary"),
  jdSummary: text("jd_summary"),
  matchScore: integer("match_score"),
  decisionHint: text("decision_hint"),
  strengths: jsonb("strengths").$type<AnalysisInsightList>(),
  gaps: jsonb("gaps").$type<AnalysisInsightList>(),
  missingKeywords: jsonb("missing_keywords").$type<string[]>(),
  interviewFocusAreas: jsonb("interview_focus_areas").$type<string[]>(),
  recommendations: jsonb("recommendations").$type<AnalysisInsightList>(),
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull().$onUpdate(() => new Date()),
});

const analysisProgressSchema = z
  .object({
    currentStep: z.string().min(1).optional(),
    stepIndex: z.number().int().min(0).optional(),
    totalSteps: z.number().int().min(1).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.stepIndex !== undefined && value.totalSteps !== undefined && value.stepIndex > value.totalSteps) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "`stepIndex` must be less than or equal to `totalSteps`.",
        path: ["stepIndex"],
      });
    }
  });

const analysisOutputSchema = z.object({
  matchScore: z.number().int().min(0).max(100).optional(),
  strengths: analysisInsightListSchema.optional(),
  gaps: analysisInsightListSchema.optional(),
  missingKeywords: z.array(z.string().min(1)).optional(),
  interviewFocusAreas: z.array(z.string().min(1)).optional(),
  recommendations: analysisInsightListSchema.optional(),
});

export const insertAnalysisSchema = createInsertSchema(analysesTable)
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({
    status: analysisStatusSchema.optional(),
  })
  .and(analysisProgressSchema)
  .and(analysisOutputSchema);

export type InsertAnalysis = z.infer<typeof insertAnalysisSchema>;
export type Analysis = typeof analysesTable.$inferSelect;
