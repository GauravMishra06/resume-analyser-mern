import { Router, Response } from "express";
import { protect, AuthRequest } from "../middleware/authMiddleware";
import { logger } from "../utils/logger";
import { AppError, ErrorCode } from "../types/errors";

const router = Router();

//////////////////////////////////////////////////////////////////
// 🔐 FETCH ACTIVE JOBS FROM REMOTIVE
//////////////////////////////////////////////////////////////////

router.get(
  "/search",
  protect,
  async (req: AuthRequest, res: Response) => {
    try {
      const { q } = req.query;

      if (!q || typeof q !== "string") {
        throw new AppError(
          ErrorCode.VALIDATION_ERROR,
          "Query parameter 'q' is required for job search"
        );
      }

      // We use Remotive API: https://remotive.com/api/remote-jobs
      const url = `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(
        q
      )}&limit=15`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch from Remotive: ${response.statusText}`);
      }

      const data = await response.json() as { jobs?: any[] };

      return res.status(200).json({
        success: true,
        data: data.jobs || [],
      });
    } catch (error) {
      logger.error("Job search failed", error);
      
      if (error instanceof AppError) {
        return res.status(400).json({
          success: false,
          error: error.code,
          message: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        error: ErrorCode.INTERNAL_ERROR,
        message:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred during job search",
      });
    }
  }
);

export default router;
