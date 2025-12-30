import { uploadBase64Image } from "./uploadBackblaze";

const BASE64_IMG_REGEX =
  /<img[^>]+src=["']data:(image\/[^;]+);base64,([^"']+)["'][^>]*>/gi;

export const replaceBase64ImagesWithUrls = async (
  html: string,
  ticketNumber: string
): Promise<{ html: string; imageUrls: string[] }> => {
  let updatedHtml = html;
  const uploadedUrls: string[] = [];

  let match;
  while ((match = BASE64_IMG_REGEX.exec(html)) !== null) {
    const mimeType = match[1];
    const base64Data = match[2];

    const imageUrl = await uploadBase64Image(
      base64Data,
      mimeType,
      ticketNumber
    );

    uploadedUrls.push(imageUrl);

    updatedHtml = updatedHtml.replace(
      match[0],
      `<img style="max-width:100%; height:auto;" src="${imageUrl}" />`
    );
  }

  return { html: updatedHtml, imageUrls: uploadedUrls };
};
