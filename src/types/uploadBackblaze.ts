import B2 from "backblaze-b2";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import sharp from "sharp";
import axios from "axios";

export interface UploadOptions {
  folder?: string;
  processImage?: boolean;
  squareSize?: number;
}

const testDirectAuth = async () => {
  const keyId = process.env.BACKBLAZE_B2_KEY_ID;
  const appKey = process.env.BACKBLAZE_B2_APPLICATION_KEY;

  console.log("Testing direct auth...");
  console.log("Key ID exists:", !!keyId);
  console.log("App Key exists:", !!appKey);
  console.log("Key ID length:", keyId?.length);
  console.log("App Key length:", appKey?.length);

  if (!keyId || !appKey) {
    throw new Error("Missing Backblaze credentials in environment variables");
  }

  const credentials = Buffer.from(`${keyId}:${appKey}`).toString("base64");

  try {
    const res = await axios.get(
      "https://api.backblazeb2.com/b2api/v2/b2_authorize_account",
      {
        headers: {
          Authorization: `Basic ${credentials}`,
        },
        timeout: 30000,
      }
    );
    console.log("Direct auth successful");
    return res.data;
  } catch (err: any) {
    console.error("Auth failed directly:", err.message);
    console.error("Response data:", err.response?.data);
    console.error("Response status:", err.response?.status);
    throw err;
  }
};
const b2 = new B2({
  applicationKeyId: process.env.BACKBLAZE_B2_KEY_ID!,
  applicationKey: process.env.BACKBLAZE_B2_APPLICATION_KEY!,
});

/**
 * Resize image if applicable
 */
export const processImageToSquare = async (
  buffer: Buffer,
  mimeType: string,
  size = 512
): Promise<Buffer> => {
  const imageTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
  ];

  if (!imageTypes.includes(mimeType)) return buffer;

  try {
    return await sharp(buffer)
      .resize(size, size, {
        fit: "cover",
        position: "center",
        kernel: "lanczos3",
      })
      .toBuffer();
  } catch {
    return buffer;
  }
};

/**
 * Upload buffer to Backblaze
 */
export const uploadToBackblaze = async (
  fileBuffer: Buffer,
  originalName: string,
  mimeType: string,
  options: UploadOptions = {}
): Promise<string> => {
  const { folder = "Email", processImage = true, squareSize = 512 } = options;
  // testDirectAuth();
  await b2.authorize();

  const bucketId = process.env.BACKBLAZE_B2_BUCKET_ID;
  if (!bucketId) throw new Error("BACKBLAZE_B2_BUCKET_ID missing");
  let finalBuffer = fileBuffer;
  if (processImage) {
    finalBuffer = await processImageToSquare(fileBuffer, mimeType, squareSize);
  }
  const { data: uploadData } = await b2.getUploadUrl({ bucketId });

  const ext = path.extname(originalName) || ".png";
  const fileName = `${folder}/${uuidv4()}${ext}`;

  await b2.uploadFile({
    uploadUrl: uploadData.uploadUrl,
    uploadAuthToken: uploadData.authorizationToken,
    fileName,
    data: finalBuffer,
    mime: mimeType,
  });
  return `${process.env.BACKBLAZE_BUCKET_URL}/${fileName}`;
  // return `https://DCC-Ticketing.s3.us-east-005.backblazeb2.com/${fileName}`;
};

/**
 * Upload BASE64 image (from email)
 */
export const uploadBase64Image = async (
  base64: string,
  mimeType: string,
  ticketNumber: string
): Promise<string> => {
  const buffer = Buffer.from(base64, "base64");
  const ext = mimeType.split("/")[1] || "png";

  return uploadToBackblaze(buffer, `email-image.${ext}`, mimeType, {
    folder: `email-inline/${ticketNumber}`,
    processImage: false, // ❗ IMPORTANT: DO NOT crop email images
  });
};
