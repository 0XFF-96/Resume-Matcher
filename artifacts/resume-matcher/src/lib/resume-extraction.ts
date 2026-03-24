import type { ResumeExtractionCode } from "@workspace/api-client-react";

/** Server reported a resume file problem the user should know about */
const ALERT_CODES = new Set<ResumeExtractionCode>([
  "empty_buffer",
  "plain_text_empty",
  "not_pdf_binary",
  "pdf_no_extractable_text",
  "pdf_encrypted",
  "pdf_parse_error",
]);

export const RESUME_EXTRACTION_STORAGE_PREFIX = "rm_resume_extraction:";

export function shouldAlertResumeExtraction(code: ResumeExtractionCode): boolean {
  return ALERT_CODES.has(code);
}
