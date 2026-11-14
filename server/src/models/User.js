const mongoose = require("mongoose");
const { Schema } = mongoose;

const ResumeSchema = new Schema({
  fileName: { type: String, required: true },
  score: { type: Number, required: true },
  feedback: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now },
  resumeId: { type: String },
  targetJob: { type: String },
});

const ResumeVersionSchema = new Schema({
  versionId: { type: String, required: true },
  resumeId: { type: String, required: true },
  fileName: { type: String, required: true },
  targetJob: { type: String },
  score: { type: Number, required: true },
  improvementsCount: { type: Number, required: true, default: 0 },
  missingSkillsCount: { type: Number, required: true, default: 0 },
  criticalIssuesCount: { type: Number, required: true, default: 0 },
  source: {
    type: String,
    enum: ["upload", "analyze", "rewrite"],
    required: true,
  },
  createdAt: { type: Date, default: Date.now },
});

const UserSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  resumes: [ResumeSchema],
  resumeVersions: [ResumeVersionSchema],
});

module.exports = mongoose.model("User", UserSchema);
