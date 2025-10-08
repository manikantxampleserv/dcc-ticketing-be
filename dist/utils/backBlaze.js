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
exports.testDirectAuth = exports.deleteFromBackblaze = exports.uploadToBackblaze = void 0;
// backblaze.ts
const backblaze_b2_1 = __importDefault(require("backblaze-b2"));
const axios_1 = __importDefault(require("axios"));
// Helper function to sanitize names
const sanitizeName = (str) => str.replace(/\s+/g, "_");
// Test direct authentication function
const testDirectAuth = () => __awaiter(void 0, void 0, void 0, function* () {
    const credentials = Buffer.from(`${process.env.BACKBLAZE_B2_KEY_ID}:${process.env.BACKBLAZE_B2_APPLICATION_KEY}`).toString("base64");
    console.log("Testing direct auth with credentials:", process.env.BACKBLAZE_B2_APPLICATION_KEY);
    try {
        const res = yield axios_1.default.get("https://api.backblazeb2.com/b2api/v2/b2_authorize_account", {
            headers: {
                Authorization: `Basic ${credentials}`,
            },
        });
        console.log("✅ Direct auth successful:", res.status);
    }
    catch (err) {
        console.error("❌ Auth failed directly:", err.message);
    }
});
exports.testDirectAuth = testDirectAuth;
// Initialize B2 client
const b2 = new backblaze_b2_1.default({
    applicationKeyId: process.env.BACKBLAZE_B2_KEY_ID,
    applicationKey: process.env.BACKBLAZE_B2_APPLICATION_KEY,
});
// Upload file to Backblaze B2
const uploadToBackblaze = (fileBuffer_1, originalName_1, mimeType_1, ...args_1) => __awaiter(void 0, [fileBuffer_1, originalName_1, mimeType_1, ...args_1], void 0, function* (fileBuffer, originalName, mimeType, folder = "general", name) {
    try {
        yield b2.authorize();
        const bucketName = process.env.BACKBLAZE_B2_BUCKET_NAME;
        if (!bucketName) {
            throw new Error("BACKBLAZE_B2_BUCKET_NAME environment variable is not set");
        }
        const { data: buckets } = yield b2.listBuckets();
        const bucket = buckets.buckets.find((b) => b.bucketName === bucketName);
        if (!bucket) {
            throw new Error("Bucket not found");
        }
        const uniqueId = Date.now();
        const fileName = name
            ? `${folder.toLowerCase()}/${sanitizeName(name).toLowerCase()}_${uniqueId}_${originalName}`
            : `${folder.toLowerCase()}/${uniqueId}_${originalName}`;
        const { data: uploadData } = yield b2.getUploadUrl({
            bucketId: bucket.bucketId,
        });
        yield b2.uploadFile({
            uploadUrl: uploadData.uploadUrl,
            uploadAuthToken: uploadData.authorizationToken,
            fileName,
            data: fileBuffer,
            mime: mimeType,
        });
        const fileUrl = `https://DCC-Ticketing.s3.us-east-005.backblazeb2.com/${fileName}`;
        return fileUrl;
    }
    catch (error) {
        console.error("❌ Upload to Backblaze failed:", error.message);
        throw error;
    }
});
exports.uploadToBackblaze = uploadToBackblaze;
// ✅ FIXED: Delete file from Backblaze B2
const deleteFromBackblaze = (fileUrl) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // 1. Extract file name from URL
        const url = new URL(fileUrl);
        const fileName = decodeURIComponent(url.pathname.replace(/^\/+/, ""));
        // 2. Authorize with B2
        yield b2.authorize();
        // 3. Get bucket
        const bucketName = process.env.BACKBLAZE_B2_BUCKET_NAME;
        if (!bucketName) {
            throw new Error("BACKBLAZE_B2_BUCKET_NAME environment variable is not set");
        }
        const { data: buckets } = yield b2.listBuckets();
        const bucket = buckets.buckets.find((b) => b.bucketName === bucketName);
        if (!bucket) {
            throw new Error("Bucket not found");
        }
        // 4. ✅ FIXED: Search for file version WITHOUT prefix parameter
        // let matchedFile: B2FileVersion | null = null;
        // let startFileName: string | undefined = undefined;
        // do {
        //   const { data: fileVersions }: { data: B2ListFileVersionsResponse } =
        //     await b2.listFileVersions({
        //       bucketId: bucket.bucketId,
        //       startFileName,
        //       maxFileCount: 1000,
        //     });
        //   // ✅ Search through results manually
        //   matchedFile =
        //     fileVersions.files.find(
        //       (f: B2FileVersion) => f.fileName === fileName
        //     ) || null;
        //   if (matchedFile) break;
        //   startFileName = fileVersions.nextFileName;
        // } while (startFileName);
        // 4. ✅ Search for file version with conditional parameter passing
        let matchedFile = null;
        let startFileName = undefined;
        do {
            // ✅ Build options object conditionally
            const listOptions = {
                bucketId: bucket.bucketId,
                maxFileCount: 1000,
            };
            // Only add startFileName if it's defined
            if (startFileName !== undefined) {
                listOptions.startFileName = startFileName;
            }
            const { data: fileVersions } = yield b2.listFileVersions(listOptions);
            // Search through results manually
            matchedFile =
                fileVersions.files.find((f) => f.fileName === fileName) || null;
            if (matchedFile)
                break;
            startFileName = fileVersions.nextFileName;
        } while (startFileName);
        if (!matchedFile) {
            console.error(`❌ File not found in B2: ${fileName}`);
            throw new Error(`File not found in bucket`);
        }
        // 5. Delete the file
        yield b2.deleteFileVersion({
            fileName: matchedFile.fileName,
            fileId: matchedFile.fileId,
        });
        console.log(`✅ File deleted successfully: ${fileName}`);
        return true;
    }
    catch (err) {
        console.error("❌ Failed to delete from B2:", err.message);
        throw err;
    }
});
exports.deleteFromBackblaze = deleteFromBackblaze;
