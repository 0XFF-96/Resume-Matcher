import { createRequire } from "node:module";
import { logger } from "../../lib/logger";

const require = createRequire(import.meta.url);
const pdfParseModule = require("pdf-parse") as {
  default?: (buffer: Buffer) => Promise<{ text?: string }>;
  PDFParse?: new (options: { data: Buffer }) => {
    getText: () => Promise<{ text?: string }>;
    destroy?: () => Promise<void> | void;
  };
};

export type ResumeExtractionCode =
  | "ok"
  | "no_resume_file"
  | "empty_buffer"
  | "plain_text_empty"
  | "not_pdf_binary"
  | "pdf_no_extractable_text"
  | "pdf_encrypted"
  | "pdf_parse_error";

export type ResumeExtraction = { ok: boolean; code: ResumeExtractionCode; message: string };
export type ResumeExtractionResult = { text: string; extraction: ResumeExtraction };

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

const PDF_SIGNATURE_SCAN_LIMIT = 4096;
const UTF8_BOM_BYTES = [0xef, 0xbb, 0xbf] as const;
const PDF_SIGNATURE_BYTES = [0x25, 0x50, 0x44, 0x46, 0x2d] as const; // %PDF-
const PLAIN_TEXT_MIME_TYPES = new Set(["text/plain", "text/markdown"]);
const PLAIN_TEXT_EXTENSIONS = [".txt", ".md"] as const;
const PDF_ENCRYPTION_HINT_PATTERN = /(password|encrypt|cipher|decrypt|owner)/i;

function normalizeResumeText(raw: string): string {
  return raw.replace(/\u0000/g, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
}

function pdfScanStart(buf: Buffer): number {
  if (
    buf.length >= UTF8_BOM_BYTES.length &&
    buf[0] === UTF8_BOM_BYTES[0] &&
    buf[1] === UTF8_BOM_BYTES[1] &&
    buf[2] === UTF8_BOM_BYTES[2]
  ) {
    return UTF8_BOM_BYTES.length;
  }
  return 0;
}

function bufferLooksLikePdf(buf: Buffer): boolean {
  const start = pdfScanStart(buf);
  const limit = Math.min(buf.length, start + PDF_SIGNATURE_SCAN_LIMIT);
  const signatureLength = PDF_SIGNATURE_BYTES.length;
  for (let i = start; i <= limit - signatureLength; i++) {
    if (
      buf[i] === PDF_SIGNATURE_BYTES[0] &&
      buf[i + 1] === PDF_SIGNATURE_BYTES[1] &&
      buf[i + 2] === PDF_SIGNATURE_BYTES[2] &&
      buf[i + 3] === PDF_SIGNATURE_BYTES[3] &&
      buf[i + 4] === PDF_SIGNATURE_BYTES[4]
    ) {
      return true;
    }
  }
  return false;
}

function classifyPdfParseError(err: unknown): "pdf_encrypted" | "pdf_parse_error" {
  const msg = err instanceof Error ? err.message : String(err);
  if (PDF_ENCRYPTION_HINT_PATTERN.test(msg)) return "pdf_encrypted";
  return "pdf_parse_error";
}

function buildExtraction(code: ResumeExtractionCode): ResumeExtraction {
  return {
    ok: code === "ok",
    code,
    message: RESUME_EXTRACTION_MESSAGES[code],
  };
}

function extractionResult(code: ResumeExtractionCode, text = ""): ResumeExtractionResult {
  return { text, extraction: buildExtraction(code) };
}

function pickFileMeta(file: Express.Multer.File) {
  return {
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
  };
}

function isPlainTextResume(file: Express.Multer.File): boolean {
  const mime = (file.mimetype || "").toLowerCase();
  const name = (file.originalname || "").toLowerCase();
  return PLAIN_TEXT_MIME_TYPES.has(mime) || PLAIN_TEXT_EXTENSIONS.some((ext) => name.endsWith(ext));
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

export async function extractResumeTextFromUpload(
  file: Express.Multer.File | undefined,
): Promise<ResumeExtractionResult> {
  if (!file) {
    return extractionResult("no_resume_file");
  }

  const fileMeta = pickFileMeta(file);

  if (!file.buffer?.length) {
    logger.warn(fileMeta, "Resume upload has empty buffer");
    return extractionResult("empty_buffer");
  }

  if (isPlainTextResume(file)) {
    const text = normalizeResumeText(file.buffer.toString("utf8"));
    if (!text) {
      logger.warn(fileMeta, "Plain-text resume decoded to empty string");
      return extractionResult("plain_text_empty");
    }
    return extractionResult("ok", text);
  }

  if (!bufferLooksLikePdf(file.buffer)) {
    logger.warn(fileMeta, "Resume buffer missing %PDF- signature; skipping pdf-parse");
    return extractionResult("not_pdf_binary");
  }

  try {
    const normalized = normalizeResumeText(await parsePdfText(file.buffer));
    if (!normalized) {
      logger.warn(fileMeta, "PDF parsed but no extractable text (e.g. scanned image-only)");
      return extractionResult("pdf_no_extractable_text");
    }
    return extractionResult("ok", normalized);
  } catch (err) {
    const code = classifyPdfParseError(err);
    logger.warn(
      { err, ...fileMeta, code },
      "Resume PDF text extraction failed",
    );
    return extractionResult(code);
  }
}
