import { pgTable, serial, text, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./auth";

export const analysesTable = pgTable("analyses", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id),
  jobTitle: text("job_title"),
  companyName: text("company_name"),
  jobDescription: text("job_description").notNull(),
  resumeText: text("resume_text"),
  status: text("status").notNull().default("pending"),
  currentStep: text("current_step"),
  stepIndex: integer("step_index"),
  totalSteps: integer("total_steps"),
  resumeSummary: text("resume_summary"),
  jdSummary: text("jd_summary"),
  matchScore: integer("match_score"),
  decisionHint: text("decision_hint"),
  strengths: jsonb("strengths"),
  gaps: jsonb("gaps"),
  missingKeywords: jsonb("missing_keywords"),
  interviewFocusAreas: jsonb("interview_focus_areas"),
  recommendations: jsonb("recommendations"),
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertAnalysisSchema = createInsertSchema(analysesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAnalysis = z.infer<typeof insertAnalysisSchema>;
export type Analysis = typeof analysesTable.$inferSelect;
