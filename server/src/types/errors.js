const ErrorCode = {
  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NO_FILE_UPLOADED: 'NO_FILE_UPLOADED',
  UNSUPPORTED_FILE_TYPE: 'UNSUPPORTED_FILE_TYPE',

  // File processing errors
  FILE_READ_ERROR: 'FILE_READ_ERROR',
  FILE_CONVERSION_ERROR: 'FILE_CONVERSION_ERROR',

  // LLM errors
  LLM_ERROR: 'LLM_ERROR',
  LLM_RESPONSE_PARSE_ERROR: 'LLM_RESPONSE_PARSE_ERROR',
  AI_ANALYSIS_ERROR: 'AI_ANALYSIS_ERROR',

  // Generic errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  INVALID_SCORE: 'INVALID_SCORE',
};

class AppError extends Error {
  constructor(code, message, details) {
    super(message);
    this.code = code;
    this.details = details;
    this.name = 'AppError';
  }

  toJSON() {
    return {
      error: this.code,
      message: this.message,
      ...(this.details && { details: this.details }),
    };
  }
}

module.exports = {
  ErrorCode,
  AppError,
};
