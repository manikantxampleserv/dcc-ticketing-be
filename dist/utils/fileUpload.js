"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleUploadErrors = exports.uploadMixedFields = exports.uploadMultipleFiles = exports.uploadSingleFile = void 0;
// middleware/fileUpload.ts
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const allowedFileTypes = {
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
const multerConfig = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
        files: 10, // Maximum 10 files
    },
    fileFilter: (req, file, cb) => {
        // Get allowed types from request params or default to 'all'
        const fileType = req.params.fileType || "all";
        const allowedExtensions = allowedFileTypes[fileType] || allowedFileTypes.all;
        const fileExtension = path_1.default.extname(file.originalname).toLowerCase();
        if (allowedExtensions.length === 0 ||
            allowedExtensions.includes(fileExtension)) {
            cb(null, true);
        }
        else {
            const error = new Error(`Invalid file type. Allowed types: ${allowedExtensions.join(", ")}`);
            error.code = "INVALID_FILE_TYPE";
            cb(error);
        }
    },
});
// Single file upload middleware
const uploadSingleFile = (fieldName = "file") => {
    return multerConfig.single(fieldName);
};
exports.uploadSingleFile = uploadSingleFile;
// Multiple files upload middleware
const uploadMultipleFiles = (fieldName = "files", maxCount = 10) => {
    return multerConfig.array(fieldName, maxCount);
};
exports.uploadMultipleFiles = uploadMultipleFiles;
// Mixed fields upload middleware
const uploadMixedFields = (fields) => {
    return multerConfig.fields(fields);
};
exports.uploadMixedFields = uploadMixedFields;
// Error handling middleware for multer errors
const handleUploadErrors = (error, req, res, next) => {
    if (error instanceof multer_1.default.MulterError) {
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
    }
    else if (error.code === "INVALID_FILE_TYPE") {
        return res.status(400).json({
            success: false,
            message: error.message,
            code: "INVALID_FILE_TYPE",
        });
    }
    next(error);
};
exports.handleUploadErrors = handleUploadErrors;
