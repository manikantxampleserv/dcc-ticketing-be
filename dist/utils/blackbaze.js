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
exports.authorizeB2 = authorizeB2;
exports.uploadFile = uploadFile;
exports.deleteFile = deleteFile;
const backblaze_b2_1 = __importDefault(require("backblaze-b2"));
const b2 = new backblaze_b2_1.default({
    applicationKeyId: process.env.BACKBLAZE_B2_KEY_ID,
    applicationKey: process.env.BACKBLAZE_B2_APPLICATION_KEY,
});
function authorizeB2() {
    return __awaiter(this, void 0, void 0, function* () {
        yield b2.authorize();
    });
}
function uploadFile(fileBuffer, fileName, mimeType) {
    return __awaiter(this, void 0, void 0, function* () {
        yield authorizeB2();
        const { data: { uploadUrl, authorizationToken }, } = yield b2.getUploadUrl({
            bucketId: process.env.BACKBLAZE_B2_BUCKET_ID,
        });
        yield b2.uploadFile({
            uploadUrl,
            uploadAuthToken: authorizationToken,
            fileName,
            data: fileBuffer,
            mime: mimeType,
        });
        return `${process.env.BACKBLAZE_BUCKET_URL}/${fileName}`;
    });
}
function deleteFile(fileName) {
    return __awaiter(this, void 0, void 0, function* () {
        yield authorizeB2();
        const response = yield b2.listFileNames({
            bucketId: process.env.BACKBLAZE_B2_BUCKET_ID,
            startFileName: fileName,
            maxFileCount: 1,
            prefix: "",
            delimiter: "",
        });
        const files = response.data.files;
        if (!files || files.length === 0) {
            console.warn(`File not found in bucket: ${fileName}`);
            return;
        }
        const fileId = files[0].fileId;
        yield b2.deleteFileVersion({
            fileId,
            fileName,
        });
    });
}
