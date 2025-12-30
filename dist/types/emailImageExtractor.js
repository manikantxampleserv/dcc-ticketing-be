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
Object.defineProperty(exports, "__esModule", { value: true });
exports.replaceBase64ImagesWithUrls = void 0;
const uploadBackblaze_1 = require("./uploadBackblaze");
const BASE64_IMG_REGEX = /<img[^>]+src=["']data:(image\/[^;]+);base64,([^"']+)["'][^>]*>/gi;
const replaceBase64ImagesWithUrls = (html, ticketNumber) => __awaiter(void 0, void 0, void 0, function* () {
    let updatedHtml = html;
    const uploadedUrls = [];
    let match;
    while ((match = BASE64_IMG_REGEX.exec(html)) !== null) {
        const mimeType = match[1];
        const base64Data = match[2];
        const imageUrl = yield (0, uploadBackblaze_1.uploadBase64Image)(base64Data, mimeType, ticketNumber);
        uploadedUrls.push(imageUrl);
        updatedHtml = updatedHtml.replace(match[0], `<img style="max-width:100%; height:auto;" src="${imageUrl}" />`);
    }
    return { html: updatedHtml, imageUrls: uploadedUrls };
});
exports.replaceBase64ImagesWithUrls = replaceBase64ImagesWithUrls;
