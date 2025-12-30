"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadBase64Image = exports.uploadToBackblaze = exports.processImageToSquare = void 0;
const backblaze_b2_1 = __importDefault(require("backblaze-b2"));
const uuid_1 = require("uuid");
const path_1 = __importDefault(require("path"));
const sharp_1 = __importDefault(require("sharp"));
const axios_1 = __importDefault(require("axios"));
const testDirectAuth = () => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const keyId = process.env.BACKBLAZE_B2_KEY_ID;
    const appKey = process.env.BACKBLAZE_B2_APPLICATION_KEY;
    console.log("Testing direct auth...");
    console.log("Key ID exists:", !!keyId);
    console.log("App Key exists:", !!appKey);
    console.log("Key ID length:", keyId === null || keyId === void 0 ? void 0 : keyId.length);
    console.log("App Key length:", appKey === null || appKey === void 0 ? void 0 : appKey.length);
    if (!keyId || !appKey) {
        throw new Error("Missing Backblaze credentials in environment variables");
    }
    const credentials = Buffer.from(`${keyId}:${appKey}`).toString("base64");
    try {
        const res = yield axios_1.default.get("https://api.backblazeb2.com/b2api/v2/b2_authorize_account", {
            headers: {
                Authorization: `Basic ${credentials}`,
            },
            timeout: 30000,
        });
        console.log("Direct auth successful");
        return res.data;
    }
    catch (err) {
        console.error("Auth failed directly:", err.message);
        console.error("Response data:", (_a = err.response) === null || _a === void 0 ? void 0 : _a.data);
        console.error("Response status:", (_b = err.response) === null || _b === void 0 ? void 0 : _b.status);
        throw err;
    }
});
const b2 = new backblaze_b2_1.default({
    applicationKeyId: process.env.BACKBLAZE_B2_KEY_ID,
    applicationKey: process.env.BACKBLAZE_B2_APPLICATION_KEY,
});
/**
 * Resize image if applicable
 */
const processImageToSquare = (buffer_1, mimeType_1, ...args_1) => __awaiter(void 0, [buffer_1, mimeType_1, ...args_1], void 0, function* (buffer, mimeType, size = 512) {
    const imageTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/webp",
    ];
    if (!imageTypes.includes(mimeType))
        return buffer;
    try {
        return yield (0, sharp_1.default)(buffer)
            .resize(size, size, {
            fit: "cover",
            position: "center",
            kernel: "lanczos3",
        })
            .toBuffer();
    }
    catch (_a) {
        return buffer;
    }
});
exports.processImageToSquare = processImageToSquare;
/**
 * Upload buffer to Backblaze
 */
const uploadToBackblaze = (fileBuffer_1, originalName_1, mimeType_1, ...args_1) => __awaiter(void 0, [fileBuffer_1, originalName_1, mimeType_1, ...args_1], void 0, function* (fileBuffer, originalName, mimeType, options = {}) {
    const { folder = "Email", processImage = true, squareSize = 512 } = options;
    // testDirectAuth();
    yield b2.authorize();
    const bucketId = process.env.BACKBLAZE_B2_BUCKET_ID;
    if (!bucketId)
        throw new Error("BACKBLAZE_B2_BUCKET_ID missing");
    let finalBuffer = fileBuffer;
    if (processImage) {
        finalBuffer = yield (0, exports.processImageToSquare)(fileBuffer, mimeType, squareSize);
    }
    const { data: uploadData } = yield b2.getUploadUrl({ bucketId });
    const ext = path_1.default.extname(originalName) || ".png";
    const fileName = `${folder}/${(0, uuid_1.v4)()}${ext}`;
    yield b2.uploadFile({
        uploadUrl: uploadData.uploadUrl,
        uploadAuthToken: uploadData.authorizationToken,
        fileName,
        data: finalBuffer,
        mime: mimeType,
    });
    return `${process.env.BACKBLAZE_BUCKET_URL}/${fileName}`;
    // return `https://DCC-Ticketing.s3.us-east-005.backblazeb2.com/${fileName}`;
});
exports.uploadToBackblaze = uploadToBackblaze;
/**
 * Upload BASE64 image (from email)
 */
const uploadBase64Image = (base64, mimeType, ticketNumber) => __awaiter(void 0, void 0, void 0, function* () {
    const buffer = Buffer.from(base64, "base64");
    const ext = mimeType.split("/")[1] || "png";
    return (0, exports.uploadToBackblaze)(buffer, `email-image.${ext}`, mimeType, {
        folder: `email-inline/${ticketNumber}`,
        processImage: false, // ❗ IMPORTANT: DO NOT crop email images
    });
});
exports.uploadBase64Image = uploadBase64Image;
