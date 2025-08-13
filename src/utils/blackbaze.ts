// utils/backblaze.ts
import B2 from "backblaze-b2";

const b2 = new B2({
  applicationKeyId: process.env.BACKBLAZE_B2_KEY_ID as string,
  applicationKey: process.env.BACKBLAZE_B2_APPLICATION_KEY as string,
});

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
  if (!files || files.length === 0) return;

  const fileId = files[0].fileId;
  await b2.deleteFileVersion({
    fileId,
    fileName,
  });
}
