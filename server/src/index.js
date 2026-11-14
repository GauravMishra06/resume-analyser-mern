const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");

const { validateEnvironment } = require("./utils/validateEnv");
const { logger } = require("./utils/logger");
const { connectDB } = require("./config/db");

const resumeRoutes = require("./routes/resume");
const authRoutes = require("./routes/auth");
const jobRoutes = require("./routes/jobs");

// Load environment variables (server/.env or root .env)
dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

// Validate env variables
validateEnvironment();

// Connect to MongoDB
connectDB();

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        "http://localhost:5173",
        "http://localhost:3000",
        "https://ai-resume-analyzer-web.onrender.com",
        process.env.CLIENT_URL,
      ].filter(Boolean);

      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        logger.warn(`CORS blocked for origin: ${origin}`);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/resume", resumeRoutes);
app.use("/api/jobs", jobRoutes);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found",
  });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error("Unhandled error:", err);
  res.status(500).json({
    success: false,
    error: "Internal server error",
  });
});

// Start server
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    logger.info(`🚀 Server running at http://localhost:${PORT}`);
  });
}

module.exports = app;
