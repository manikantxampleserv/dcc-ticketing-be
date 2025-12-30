import axios from "axios";
import B2 from "backblaze-b2";

const b2 = new B2({
  applicationKeyId: process.env.BACKBLAZE_B2_KEY_ID as string,
  applicationKey: process.env.BACKBLAZE_B2_APPLICATION_KEY as string,
});

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
export async function authorizeB2(): Promise<void> {
  await b2.authorize();
}

export async function uploadFile(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<string> {
  await authorizeB2();

  const {
    data: { uploadUrl, authorizationToken },
  } = await b2.getUploadUrl({
    bucketId: process.env.BACKBLAZE_B2_BUCKET_ID as string,
  });

  await b2.uploadFile({
    uploadUrl,
    uploadAuthToken: authorizationToken,
    fileName,
    data: fileBuffer,
    mime: mimeType,
  });

  return `${process.env.BACKBLAZE_BUCKET_URL}/${fileName}`;
}

export async function deleteFile(fileName: string): Promise<void> {
  await authorizeB2();

  const response = await b2.listFileNames({
    bucketId: process.env.BACKBLAZE_B2_BUCKET_ID as string,
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

  await b2.deleteFileVersion({
    fileId,
    fileName,
  });
}
