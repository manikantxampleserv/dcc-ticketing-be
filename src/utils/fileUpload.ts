// middleware/fileUpload.ts
import multer from "multer";
import { Request, Response, NextFunction } from "express";
import path from "path";

// Define allowed file types
interface FileTypeConfig {
  images: string[];
  documents: string[];
  videos: string[];
  all: string[];
}

const allowedFileTypes: FileTypeConfig = {
  images: [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"],
  documents: [
    ".pdf",
    ".doc",
    ".docx",
    ".txt",
    ".xlsx",
    ".xls",
    ".ppt",
    ".pptx",
  ],
  videos: [".mp4", ".avi", ".mkv", ".mov", ".wmv", ".flv"],
  all: [],
};

// Extend allowed types to include all
allowedFileTypes.all = [
  ...allowedFileTypes.images,
  ...allowedFileTypes.documents,
  ...allowedFileTypes.videos,
];

// Configure multer for memory storage (since we're uploading to cloud)
const multerConfig = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 10, // Maximum 10 files
  },
  fileFilter: (
    req: Request,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback
  ) => {
    // Get allowed types from request params or default to 'all'
    const fileType = (req.params.fileType as keyof FileTypeConfig) || "all";
    const allowedExtensions =
      allowedFileTypes[fileType] || allowedFileTypes.all;

    const fileExtension = path.extname(file.originalname).toLowerCase();

    if (
      allowedExtensions.length === 0 ||
      allowedExtensions.includes(fileExtension)
    ) {
      cb(null, true);
    } else {
      const error = new Error(
        `Invalid file type. Allowed types: ${allowedExtensions.join(", ")}`
      );
      (error as any).code = "INVALID_FILE_TYPE";
      cb(error);
    }
  },
});

// Single file upload middleware
export const uploadSingleFile = (fieldName: string = "file") => {
  return multerConfig.single(fieldName);
};

// Multiple files upload middleware
export const uploadMultipleFiles = (
  fieldName: string = "files",
  maxCount: number = 10
) => {
  return multerConfig.array(fieldName, maxCount);
};

// Mixed fields upload middleware
export const uploadMixedFields = (
  fields: { name: string; maxCount: number }[]
) => {
  return multerConfig.fields(fields);
};

// Error handling middleware for multer errors
export const handleUploadErrors = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (error instanceof multer.MulterError) {
    let message = "File upload error";

    switch (error.code) {
      case "LIMIT_FILE_SIZE":
        message = "File too large. Maximum size is 50MB";
        break;
      case "LIMIT_FILE_COUNT":
        message = "Too many files. Maximum is 10 files";
        break;
      case "LIMIT_UNEXPECTED_FILE":
        message = "Unexpected file field";
        break;
      default:
        message = error.message;
    }

    return res.status(400).json({
      success: false,
      message,
      code: error.code,
    });
  } else if (error.code === "INVALID_FILE_TYPE") {
    return res.status(400).json({
      success: false,
      message: error.message,
      code: "INVALID_FILE_TYPE",
    });
  }

  next(error);
};
