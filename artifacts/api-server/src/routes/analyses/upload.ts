import multer from "multer";
import type { RequestHandler } from "express";
import { logger } from "../../lib/logger";

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

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

export const uploadResumeMiddleware: RequestHandler = (req, res, next) => {
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
