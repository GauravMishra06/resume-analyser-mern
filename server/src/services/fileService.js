const fs = require("fs");
const path = require("path");
const { pdfToPng } = require("pdf-to-png-converter");
const mammoth = require("mammoth");
const { AppError, ErrorCode } = require("../types/errors");
const { logger } = require("../utils/logger");

const pdfParseModule = require("pdf-parse");

const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];
const PDF_EXTENSIONS = [".pdf"];
const DOCX_EXTENSIONS = [".docx", ".doc"];

function isImageFile(ext) {
  return IMAGE_EXTENSIONS.includes(ext.toLowerCase());
}

function isPdfFile(ext) {
  return PDF_EXTENSIONS.includes(ext.toLowerCase());
}

function isDocxFile(ext) {
  return DOCX_EXTENSIONS.includes(ext.toLowerCase());
}

function getMimeType(ext) {
  const mimeMap = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".pdf": "application/pdf",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".doc": "application/msword",
  };
  return mimeMap[ext.toLowerCase()] || "application/octet-stream";
}

async function convertPdfToImages(buffer) {
  try {
    logger.info("Converting PDF to images...");

    const arrayBuffer = buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength
    );

    const pngPages = await pdfToPng(arrayBuffer, {
      disableFontFace: true,
      useSystemFonts: true,
      viewportScale: 2.0,
      returnPageContent: true,
    });

    const base64Images = pngPages
      .filter((page) => page.content)
      .map((page) => page.content.toString("base64"));

    if (base64Images.length === 0) {
      throw new Error("No pages could be converted to images");
    }

    logger.info(`Converted PDF to ${base64Images.length} image(s)`);
    return base64Images;
  } catch (err) {
    logger.error("PDF to image conversion failed:", err);
    throw new AppError(
      ErrorCode.FILE_CONVERSION_ERROR,
      "Failed to convert PDF to images",
      err instanceof Error ? err.message : String(err)
    );
  }
}

async function extractPdfText(buffer) {
  let parser = null;
  try {
    const PDFParseCtor = pdfParseModule.PDFParse || pdfParseModule.default?.PDFParse;

    if (!PDFParseCtor) {
      if (typeof pdfParseModule === 'function') {
        const data = await pdfParseModule(buffer);
        const text = data.text?.trim() || "";
        logger.info(`Extracted ${text.length} characters from PDF`);
        return text;
      }
      logger.warn("pdf-parse parser constructor not found; skipping PDF text extraction");
      return "";
    }

    parser = new PDFParseCtor({ data: new Uint8Array(buffer) });
    const data = await parser.getText();
    const text = data.text?.trim() || "";
    logger.info(`Extracted ${text.length} characters from PDF`);
    return text;
  } catch (err) {
    logger.warn("PDF text extraction failed (non-fatal):", err instanceof Error ? err.message : String(err));
    return "";
  } finally {
    if (parser?.destroy) {
      await parser.destroy().catch(() => undefined);
    }
  }
}

async function extractDocxText(buffer) {
  try {
    logger.info("Extracting text from DOCX...");

    const result = await mammoth.extractRawText({ buffer });
    const text = result.value;

    if (!text || text.trim().length === 0) {
      logger.warn("DOCX appears to be empty or contains no extractable text");
      return "[Empty document]";
    }

    logger.info(`Extracted ${text.length} characters from DOCX`);
    return text;
  } catch (err) {
    logger.error("DOCX text extraction failed:", err);
    throw new AppError(
      ErrorCode.FILE_CONVERSION_ERROR,
      "Failed to extract text from DOCX",
      err instanceof Error ? err.message : String(err)
    );
  }
}

async function prepareFileForAnalysis(filePath, originalName) {
  const ext = path.extname(originalName).toLowerCase();
  const mimeType = getMimeType(ext);

  if (!fs.existsSync(filePath)) {
    throw new AppError(
      ErrorCode.FILE_READ_ERROR,
      "File not found",
      `Path: ${filePath}`
    );
  }

  let buffer;
  try {
    buffer = fs.readFileSync(filePath);
  } catch (err) {
    throw new AppError(
      ErrorCode.FILE_READ_ERROR,
      "Failed to read uploaded file",
      err instanceof Error ? err.message : String(err)
    );
  }

  if (buffer.length === 0) {
    throw new AppError(
      ErrorCode.FILE_READ_ERROR,
      "Uploaded file is empty"
    );
  }

  if (isImageFile(ext)) {
    logger.info(`Processing image file: ${originalName}`);
    return {
      originalName,
      extension: ext,
      mimeType,
      isImage: true,
      isDocx: false,
      images: [buffer.toString("base64")],
    };
  }

  if (isPdfFile(ext)) {
    logger.info(`Processing PDF file: ${originalName}`);
    const pdfText = await extractPdfText(buffer);

    let images;
    try {
      images = await convertPdfToImages(buffer);
    } catch (err) {
      logger.warn(
        "PDF image conversion failed; proceeding with extracted text only",
        err instanceof Error ? err.message : String(err)
      );
    }

    if ((!images || images.length === 0) && !pdfText) {
      throw new AppError(
        ErrorCode.FILE_CONVERSION_ERROR,
        "Failed to process PDF",
        "Could not extract readable text or convert PDF pages to images"
      );
    }

    return {
      originalName,
      extension: ext,
      mimeType,
      isImage: false,
      isDocx: false,
      images,
      text: pdfText || undefined,
    };
  }

  if (isDocxFile(ext)) {
    logger.info(`Processing DOCX file: ${originalName}`);
    const text = await extractDocxText(buffer);
    return {
      originalName,
      extension: ext,
      mimeType,
      isImage: false,
      isDocx: true,
      text,
    };
  }

  throw new AppError(
    ErrorCode.UNSUPPORTED_FILE_TYPE,
    "File type not supported",
    `Received: ${ext}. Supported: PDF, DOCX, JPG, PNG`
  );
}

module.exports = {
  prepareFileForAnalysis,
};
