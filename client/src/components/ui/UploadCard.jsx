import React, { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, Loader2, CheckCircle, AlertCircle, Briefcase } from 'lucide-react';

const ACCEPTED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'image/jpeg',
  'image/png',
  'image/webp',
];

const ACCEPTED_EXTENSIONS = '.pdf,.docx,.doc,.jpg,.jpeg,.png,.webp';

export const UploadCard = ({
  onFileSelect,
  processingState,
  errorMessage,
  jobRole,
  onJobRoleChange,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState(null);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (ACCEPTED_TYPES.includes(file.type)) {
        setFileName(file.name);
        onFileSelect(file);
      }
    }
  }, [onFileSelect]);

  const handleFileChange = useCallback((e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setFileName(files[0].name);
      onFileSelect(files[0]);
    }
  }, [onFileSelect]);

  const isProcessing = processingState === 'uploading' || processingState === 'processing';
  const isComplete = processingState === 'complete';
  const isError = processingState === 'error';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-[580px] mx-auto space-y-6"
    >
      {/* Job Role Input */}
      <div className="relative group">
        <div className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary-400 transition-colors duration-500 z-10">
          <Briefcase className="w-5 h-5" />
        </div>
        <input
          type="text"
          value={jobRole}
          onChange={(e) => onJobRoleChange(e.target.value)}
          placeholder="Target Job Role (Optional)"
          disabled={isProcessing}
          className={`
            w-full pl-16 pr-6 py-5 rounded-[2rem]
            bg-surface-100/40 backdrop-blur-2xl border border-white/[0.08]
            shadow-2xl shadow-black/40
            text-white placeholder-gray-500
            focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500/40
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-all duration-500 ease-expo
          `}
        />
      </div>

      {/* Main Upload Area */}
      <label
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative flex flex-col items-center justify-center p-12 lg:p-14
          rounded-[2.5rem] cursor-pointer group
          border-2 border-dashed transition-all duration-700 ease-expo
          shadow-2xl shadow-black/40 overflow-hidden backdrop-blur-2xl
          ${
            isDragging
              ? 'border-primary-400 bg-primary-500/[0.08] scale-[1.02] shadow-glow-lg'
              : 'border-white/[0.12] bg-surface-100/40 hover:bg-surface-100/60 hover:border-white/20 hover:scale-[1.01]'
          }
          ${isProcessing ? 'pointer-events-none' : ''}
          ${isError ? 'border-error/40 bg-error/[0.03]' : ''}
          ${isComplete ? 'border-success/40 bg-success/[0.03]' : ''}
        `}
      >
        <input
          type="file"
          accept={ACCEPTED_EXTENSIONS}
          onChange={handleFileChange}
          disabled={isProcessing}
          className="hidden"
        />

        <div className="relative z-10 flex flex-col items-center text-center space-y-6">
          <AnimatePresence mode="wait">
            {isProcessing && (
              <motion.div
                key="processing"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex flex-col items-center space-y-4"
              >
                <div className="w-16 h-16 rounded-3xl bg-primary-500/10 flex items-center justify-center shadow-glow-sm">
                  <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-lg text-white">
                    {processingState === 'uploading' ? 'Uploading document...' : 'Analyzing with AI...'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {processingState === 'uploading' ? 'Almost ready' : 'Extracting skills, tone, and ATS score'}
                  </p>
                </div>
              </motion.div>
            )}

            {isComplete && (
              <motion.div
                key="complete"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex flex-col items-center space-y-4"
              >
                <div className="w-16 h-16 rounded-3xl bg-success/10 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-success" />
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-lg text-white">Analysis Complete</p>
                  <p className="text-sm text-gray-500">Preparing your insights dashboard...</p>
                </div>
              </motion.div>
            )}

            {isError && (
              <motion.div
                key="error"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex flex-col items-center space-y-4"
              >
                <div className="w-16 h-16 rounded-3xl bg-error/10 flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-error" />
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-lg text-error">Upload Failed</p>
                  <p className="text-sm text-gray-400 max-w-xs">{errorMessage || 'Please try again'}</p>
                </div>
              </motion.div>
            )}

            {!isProcessing && !isComplete && !isError && (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center space-y-4"
              >
                <div className="w-20 h-20 rounded-[2rem] bg-gradient-to-tr from-white/[0.03] to-white/[0.08] border border-white/10 flex items-center justify-center group-hover:scale-110 group-hover:from-primary-500/20 group-hover:to-accent-violet/20 group-hover:border-primary-500/30 transition-all duration-700 shadow-glow-sm">
                  {fileName ? (
                    <FileText className="w-9 h-9 text-primary-400" />
                  ) : (
                    <Upload className="w-9 h-9 text-gray-400 group-hover:text-primary-400 transition-colors duration-500" />
                  )}
                </div>
                <div className="space-y-2">
                  <p className="font-semibold text-xl text-white tracking-tight">
                    {fileName || 'Drop your resume here, or browse'}
                  </p>
                  <p className="text-sm text-gray-500 font-medium">
                    PDF, DOCX, DOC, JPG, or PNG (up to 10MB)
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </label>
    </motion.div>
  );
};

export default UploadCard;
