const multer = require('multer');
const path = require('path');

// Configure multer for memory storage (we'll extract text, not save files)
const storage = multer.memoryStorage();

// File filter to accept only PDF, DOCX, DOC
const fileFilter = (_req, file, cb) => {
  const allowedMimes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
  ];

  const allowedExts = ['.pdf', '.docx', '.doc'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, DOCX, and DOC are allowed.'));
  }
};

const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

module.exports = uploadMiddleware;
module.exports.uploadMiddleware = uploadMiddleware;
