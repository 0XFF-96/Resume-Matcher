import { analysesTable, db } from "@workspace/db";
import { eq } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";
import { logger } from "../../lib/logger";

const WORKFLOW_STEPS = [
  "Extracting resume text",
  "Parsing resume profile",
  "Parsing job description",
  "Matching resume to JD",
  "Generating recommendations",
];

type ResumeProfile = {
  summary: string;
  skills: string[];
  experience_years: number | null;
  domains: string[];
  education: string;
};

type JdProfile = {
  summary: string;
  required_skills: string[];
  preferred_skills: string[];
  experience_required: string;
  domain: string;
  key_responsibilities: string[];
};

type MatchResult = {
  match_score: number;
  decision_hint: string;
  strengths: { skill: string; description: string }[];
  gaps: { skill: string; description: string; severity: string }[];
  missing_keywords: string[];
  interview_focus_areas: string[];
};

type RecommendationResult = { recommendations: { type: string; content: string }[] };
type AnalysisInsight = string | { title: string; detail?: string; score?: number };

async function updateAnalysis(id: number, data: Partial<typeof analysesTable.$inferInsert>) {
  await db
    .update(analysesTable)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(analysesTable.id, id));
}

function extractJsonObject(content: string): string | null {
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  return jsonMatch ? jsonMatch[0] : null;
}

function parseJsonObject<T>(content: string, fallback: T): T {
  try {
    const jsonText = extractJsonObject(content);
    return jsonText ? (JSON.parse(jsonText) as T) : fallback;
  } catch {
    return fallback;
  }
}

function buildDefaultResumeProfile(): ResumeProfile {
  return {
    summary: "",
    skills: [],
    experience_years: null,
    domains: [],
    education: "",
  };
}

function buildDefaultJdProfile(): JdProfile {
  return {
    summary: "",
    required_skills: [],
    preferred_skills: [],
    experience_required: "",
    domain: "",
    key_responsibilities: [],
  };
}

function buildDefaultMatchResult(): MatchResult {
  return {
    match_score: 0,
    decision_hint: "Needs Review",
    strengths: [],
    gaps: [],
    missing_keywords: [],
    interview_focus_areas: [],
  };
}

function buildDefaultRecommendationResult(): RecommendationResult {
  return { recommendations: [] };
}

function toStrengthInsights(strengths: MatchResult["strengths"]): AnalysisInsight[] {
  return strengths.map((item) => ({
    title: item.skill || "Strength",
    detail: item.description || undefined,
  }));
}

function toGapInsights(gaps: MatchResult["gaps"]): AnalysisInsight[] {
  return gaps.map((item) => ({
    title: item.skill || "Gap",
    detail: item.description ? `${item.description} (${item.severity})` : item.severity,
  }));
}

function toRecommendationInsights(recommendations: RecommendationResult["recommendations"]): AnalysisInsight[] {
  return recommendations.map((item) => ({
    title: item.type || "Recommendation",
    detail: item.content || undefined,
  }));
}

async function setWorkflowStep(analysisId: number, stepIndex: number) {
  await updateAnalysis(analysisId, { currentStep: WORKFLOW_STEPS[stepIndex], stepIndex });
}

async function parseResumeProfile(resumeText: string): Promise<ResumeProfile> {
  const response = await openai.chat.completions.create({
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

  const content = response.choices[0]?.message?.content ?? "{}";
  return parseJsonObject(content, buildDefaultResumeProfile());
}

async function parseJobDescription(jobDescription: string): Promise<JdProfile> {
  const response = await openai.chat.completions.create({
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

  const content = response.choices[0]?.message?.content ?? "{}";
  return parseJsonObject(content, buildDefaultJdProfile());
}

async function generateMatchResult(resumeProfile: ResumeProfile, jdProfile: JdProfile): Promise<MatchResult> {
  const response = await openai.chat.completions.create({
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

  const content = response.choices[0]?.message?.content ?? "{}";
  return parseJsonObject(content, buildDefaultMatchResult());
}

async function generateRecommendations(
  matchResult: MatchResult,
  resumeProfile: ResumeProfile,
  jdProfile: JdProfile,
): Promise<RecommendationResult> {
  const response = await openai.chat.completions.create({
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

  const content = response.choices[0]?.message?.content ?? "{}";
  return parseJsonObject(content, buildDefaultRecommendationResult());
}

export async function runWorkflow(analysisId: number, resumeText: string, jobDescription: string) {
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

    currentStep = WORKFLOW_STEPS[1];
    currentStepIndex = 1;
    await setWorkflowStep(analysisId, 1);
    const resumeProfile = await parseResumeProfile(resumeText);

    currentStep = WORKFLOW_STEPS[2];
    currentStepIndex = 2;
    await setWorkflowStep(analysisId, 2);
    const jdProfile = await parseJobDescription(jobDescription);

    currentStep = WORKFLOW_STEPS[3];
    currentStepIndex = 3;
    await setWorkflowStep(analysisId, 3);
    const matchResult = await generateMatchResult(resumeProfile, jdProfile);

    currentStep = WORKFLOW_STEPS[4];
    currentStepIndex = 4;
    await setWorkflowStep(analysisId, 4);
    const recoResult = await generateRecommendations(matchResult, resumeProfile, jdProfile);

    await updateAnalysis(analysisId, {
      status: "completed",
      currentStep: null,
      resumeSummary: resumeProfile.summary,
      jdSummary: jdProfile.summary,
      matchScore: matchResult.match_score,
      decisionHint: matchResult.decision_hint,
      strengths: toStrengthInsights(matchResult.strengths),
      gaps: toGapInsights(matchResult.gaps),
      missingKeywords: matchResult.missing_keywords,
      interviewFocusAreas: matchResult.interview_focus_areas,
      recommendations: toRecommendationInsights(recoResult.recommendations),
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
