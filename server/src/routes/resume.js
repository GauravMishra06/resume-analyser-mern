const { Router } = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const { prepareFileForAnalysis } = require("../services/fileService");
const {
  analyzeResume,
  analyzeJobDescriptionMatch,
  generateRewriteSuggestions,
  generateInterviewReadiness,
  generateResumeHtml,
} = require("../services/resumeLLMService");
const { AppError, ErrorCode } = require("../types/errors");
const { logger } = require("../utils/logger");

const { protect } = require("../middleware/authMiddleware");
const User = require("../models/User");

const router = Router();

/**
 * Absolute path to uploads directory
 */
const UPLOAD_DIR = path.resolve(__dirname, "../../uploads");

/**
 * Ensure upload directory exists
 */
function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

/**
 * Safely delete file
 */
function safeDeleteFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      logger.debug(`Cleaned up file: ${path.basename(filePath)}`);
    }
  } catch (err) {
    logger.warn(`Failed to cleanup file: ${path.basename(filePath)}`);
  }
}

/**
 * Multer config
 */
const ACCEPTED_MIMES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "image/jpeg",
  "image/png",
  "image/webp",
];

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    if (!ACCEPTED_MIMES.includes(file.mimetype)) {
      cb(
        new AppError(
          ErrorCode.UNSUPPORTED_FILE_TYPE,
          "Unsupported file type",
          `Received: ${file.mimetype}`
        )
      );
    } else {
      cb(null, true);
    }
  },
});

/**
 * Error response helper
 */
function sendErrorResponse(
  res,
  error,
  defaultMessage = "An unexpected error occurred"
) {
  if (error instanceof AppError) {
    res.status(400).json({
      success: false,
      error: error.code,
      message: error.message,
      ...(error.details && { details: error.details }),
    });
  } else {
    const message = error instanceof Error ? error.message : defaultMessage;
    res.status(500).json({
      success: false,
      error: ErrorCode.INTERNAL_ERROR,
      message,
    });
  }
}

//////////////////////////////////////////////////////////////////
// 🔐 PROTECTED UPLOAD + ANALYZE ROUTE
//////////////////////////////////////////////////////////////////

router.post(
  "/upload",
  protect,
  upload.single("file"),
  async (req, res) => {
    let filePath = null;

    try {
      if (!req.file) {
        throw new AppError(
          ErrorCode.NO_FILE_UPLOADED,
          "No file uploaded"
        );
      }

      ensureUploadDir();

      const ext = path.extname(req.file.originalname).toLowerCase();
      const resumeId = `${Date.now()}-${Math.random()
        .toString(36)
        .substring(2)}`;
      const filename = `${resumeId}${ext}`;
      filePath = path.join(UPLOAD_DIR, filename);

      fs.writeFileSync(filePath, req.file.buffer);

      const preparedFile = await prepareFileForAnalysis(
        filePath,
        req.file.originalname
      );

      const analysis = await analyzeResume({
        resume_text: preparedFile.text,
        images: preparedFile.images,
        target_job: req.body?.target_job,
      });

      //////////////////////////////////////////////////////////////
      // ✅ SAVE TO MONGODB UNDER USER
      //////////////////////////////////////////////////////////////
      await User.findByIdAndUpdate(req.user.id, {
        $push: {
          resumes: {
            fileName: req.file.originalname,
            score: analysis.suitability_score,
            feedback: analysis.overall_feedback,
            uploadedAt: new Date(),
            resumeId,
            targetJob: req.body?.target_job,
          },
          resumeVersions: {
            versionId: `${resumeId}-v1`,
            resumeId,
            fileName: req.file.originalname,
            targetJob: req.body?.target_job,
            score: analysis.score ?? analysis.suitability_score,
            improvementsCount: (analysis.improvements ?? analysis.resume_fixes ?? []).length,
            missingSkillsCount: (analysis.missing_skills ?? []).length,
            criticalIssuesCount: (analysis.potential_problems ?? analysis.weaknesses ?? []).length,
            source: "upload",
            createdAt: new Date(),
          },
        },
      });

      return res.status(200).json({
        success: true,
        data: {
          resume_id: resumeId,
          file_name: req.file.originalname,
          extracted_text: preparedFile.text,
          analysis,
        },
      });
    } catch (error) {
      logger.error("Upload failed", error);
      return sendErrorResponse(res, error);
    } finally {
      if (filePath) safeDeleteFile(filePath);
    }
  }
);

//////////////////////////////////////////////////////////////////
// 🔐 PROTECTED TEXT ANALYZE ROUTE
//////////////////////////////////////////////////////////////////

router.post(
  "/analyze",
  protect,
  async (req, res) => {
    try {
      const { resume_text, target_job } = req.body;

      if (!resume_text || resume_text.length < 50) {
        throw new AppError(
          ErrorCode.VALIDATION_ERROR,
          "Resume text too short"
        );
      }

      const analysis = await analyzeResume({
        resume_text,
        target_job,
      });

      //////////////////////////////////////////////////////////////
      // ✅ SAVE TEXT ANALYSIS
      //////////////////////////////////////////////////////////////
      await User.findByIdAndUpdate(req.user.id, {
        $push: {
          resumes: {
            fileName: "text-analysis",
            score: analysis.suitability_score,
            feedback: analysis.overall_feedback,
            uploadedAt: new Date(),
            targetJob: target_job,
          },
          resumeVersions: {
            versionId: `${Date.now()}-analyze-v1`,
            resumeId: `${Date.now()}-text`,
            fileName: "text-analysis",
            targetJob: target_job,
            score: analysis.score ?? analysis.suitability_score,
            improvementsCount: (analysis.improvements ?? analysis.resume_fixes ?? []).length,
            missingSkillsCount: (analysis.missing_skills ?? []).length,
            criticalIssuesCount: (analysis.potential_problems ?? analysis.weaknesses ?? []).length,
            source: "analyze",
            createdAt: new Date(),
          },
        },
      });

      return res.status(200).json({
        success: true,
        data: analysis,
      });
    } catch (error) {
      logger.error("Text analysis failed", error);
      return sendErrorResponse(res, error);
    }
  }
);

//////////////////////////////////////////////////////////////////
// 🔐 FETCH USER RESUME HISTORY
//////////////////////////////////////////////////////////////////

router.get(
  "/my-resumes",
  protect,
  async (req, res) => {
    try {
      const user = await User.findById(req.user.id).select("resumes");

      return res.status(200).json({
        success: true,
        resumes: user?.resumes || [],
      });
    } catch (error) {
      logger.error("Failed to fetch resumes", error);
      return sendErrorResponse(res, error);
    }
  }
);

//////////////////////////////////////////////////////////////////
// 🔐 JOB DESCRIPTION MATCH MAP
//////////////////////////////////////////////////////////////////

router.post(
  "/jd-match",
  protect,
  async (req, res) => {
    try {
      const { resume_text, job_description, target_job } = req.body;

      if (!resume_text || typeof resume_text !== "string" || resume_text.length < 50) {
        throw new AppError(
          ErrorCode.VALIDATION_ERROR,
          "Resume text too short"
        );
      }

      if (
        !job_description ||
        typeof job_description !== "string" ||
        job_description.length < 30
      ) {
        throw new AppError(
          ErrorCode.VALIDATION_ERROR,
          "Job description too short"
        );
      }

      const match = await analyzeJobDescriptionMatch(
        resume_text,
        job_description,
        target_job
      );

      return res.status(200).json({
        success: true,
        data: match,
      });
    } catch (error) {
      logger.error("JD match analysis failed", error);
      return sendErrorResponse(res, error);
    }
  }
);

//////////////////////////////////////////////////////////////////
// 🔐 REWRITE STUDIO SUGGESTIONS
//////////////////////////////////////////////////////////////////

router.post(
  "/rewrite",
  protect,
  async (req, res) => {
    try {
      const { resume_text, target_job } = req.body;

      if (!resume_text || typeof resume_text !== "string" || resume_text.length < 50) {
        throw new AppError(
          ErrorCode.VALIDATION_ERROR,
          "Resume text too short"
        );
      }

      const rewrite = await generateRewriteSuggestions(resume_text, target_job);

      return res.status(200).json({
        success: true,
        data: rewrite,
      });
    } catch (error) {
      logger.error("Rewrite suggestion generation failed", error);
      return sendErrorResponse(res, error);
    }
  }
);

//////////////////////////////////////////////////////////////////
// 🔐 INTERVIEW READINESS
//////////////////////////////////////////////////////////////////

router.post(
  "/interview-readiness",
  protect,
  async (req, res) => {
    try {
      const { resume_text, target_job } = req.body;

      if (!resume_text || typeof resume_text !== "string" || resume_text.length < 50) {
        throw new AppError(
          ErrorCode.VALIDATION_ERROR,
          "Resume text too short"
        );
      }

      const readiness = await generateInterviewReadiness(resume_text, target_job);

      return res.status(200).json({
        success: true,
        data: readiness,
      });
    } catch (error) {
      logger.error("Interview readiness generation failed", error);
      return sendErrorResponse(res, error);
    }
  }
);

//////////////////////////////////////////////////////////////////
// 🔐 RESUME VERSION TIMELINE
//////////////////////////////////////////////////////////////////

router.get(
  "/versions",
  protect,
  async (req, res) => {
    try {
      const user = await User.findById(req.user.id).select("resumeVersions");
      const versions = [...(user?.resumeVersions || [])].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      return res.status(200).json({
        success: true,
        data: versions,
      });
    } catch (error) {
      logger.error("Failed to fetch resume versions", error);
      return sendErrorResponse(res, error);
    }
  }
);

router.post(
  "/versions",
  protect,
  async (req, res) => {
    try {
      const {
        resume_id,
        file_name,
        target_job,
        score,
        improvements_count,
        missing_skills_count,
        critical_issues_count,
        source,
      } = req.body;

      if (!resume_id || !file_name || score === undefined) {
        throw new AppError(
          ErrorCode.VALIDATION_ERROR,
          "resume_id, file_name and score are required"
        );
      }

      const version = {
        versionId: `${resume_id}-${Date.now()}`,
        resumeId: String(resume_id),
        fileName: String(file_name),
        targetJob: target_job ? String(target_job) : undefined,
        score: Number(score),
        improvementsCount: Number(improvements_count || 0),
        missingSkillsCount: Number(missing_skills_count || 0),
        criticalIssuesCount: Number(critical_issues_count || 0),
        source: source === "rewrite" ? "rewrite" : "analyze",
        createdAt: new Date(),
      };

      await User.findByIdAndUpdate(req.user.id, {
        $push: {
          resumeVersions: version,
        },
      });

      return res.status(201).json({
        success: true,
        data: version,
      });
    } catch (error) {
      logger.error("Failed to save resume version", error);
      return sendErrorResponse(res, error);
    }
  }
);

//////////////////////////////////////////////////////////////////
// 🔐 EXPORT REWRITTEN RESUME AS DOCX
//////////////////////////////////////////////////////////////////

router.post(
  "/export",
  protect,
  async (req, res) => {
    try {
      const { final_resume_text } = req.body;

      if (!final_resume_text || typeof final_resume_text !== "string") {
        throw new AppError(
          ErrorCode.VALIDATION_ERROR,
          "final_resume_text is required"
        );
      }

      // Generate HTML from the text using LLM
      const htmlContent = await generateResumeHtml(final_resume_text);

      // Convert HTML to DOCX buffer
      const HTMLtoDOCX = require("html-to-docx");
      const fileBuffer = await HTMLtoDOCX(htmlContent, null, {
        table: { row: { cantSplit: true } },
        footer: true,
        pageNumber: true,
      });

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      );
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=rewritten_resume.docx"
      );
      
      return res.status(200).send(fileBuffer);
    } catch (error) {
      logger.error("Failed to export DOCX", error);
      return sendErrorResponse(res, error);
    }
  }
);

module.exports = router;
