// backblaze.ts
import B2 from "backblaze-b2";
import path from "path";
import axios from "axios";

// Type definitions for better type safety
interface B2Bucket {
  bucketId: string;
  bucketName: string;
  bucketType: string;
}

interface B2FileVersion {
  fileName: string;
  fileId: string;
  size: number;
  uploadTimestamp: number;
}

interface B2UploadData {
  uploadUrl: string;
  authorizationToken: string;
}

interface B2ListBucketsResponse {
  buckets: B2Bucket[];
}

interface B2ListFileVersionsResponse {
  files: B2FileVersion[];
  nextFileName?: string;
}

// Helper function to sanitize names
const sanitizeName = (str: string): string => str.replace(/\s+/g, "_");

// Test direct authentication function
const testDirectAuth = async (): Promise<void> => {
  const credentials = Buffer.from(
    `${process.env.BACKBLAZE_B2_KEY_ID}:${process.env.BACKBLAZE_B2_APPLICATION_KEY}`
  ).toString("base64");
  console.log(
    "Testing direct auth with credentials:",
    process.env.BACKBLAZE_B2_APPLICATION_KEY
  );
  try {
    const res = await axios.get(
      "https://api.backblazeb2.com/b2api/v2/b2_authorize_account",
      {
        headers: {
          Authorization: `Basic ${credentials}`,
        },
      }
    );
    console.log("✅ Direct auth successful:", res.status);
  } catch (err: any) {
    console.error("❌ Auth failed directly:", err.message);
  }
};

// Initialize B2 client
const b2 = new B2({
  applicationKeyId: process.env.BACKBLAZE_B2_KEY_ID!,
  applicationKey: process.env.BACKBLAZE_B2_APPLICATION_KEY!,
});

// Upload file to Backblaze B2
const uploadToBackblaze = async (
  fileBuffer: Buffer,
  originalName: string,
  mimeType: string,
  folder: string = "general",
  name?: string
): Promise<string> => {
  try {
    await b2.authorize();

    const bucketName = process.env.BACKBLAZE_B2_BUCKET_NAME;
    if (!bucketName) {
      throw new Error(
        "BACKBLAZE_B2_BUCKET_NAME environment variable is not set"
      );
    }

    const { data: buckets }: { data: B2ListBucketsResponse } =
      await b2.listBuckets();
    const bucket = buckets.buckets.find(
      (b: B2Bucket) => b.bucketName === bucketName
    );

    if (!bucket) {
      throw new Error("Bucket not found");
    }

    const uniqueId = Date.now();
    const fileName = name
      ? `${folder.toLowerCase()}/${sanitizeName(
          name
        ).toLowerCase()}_${uniqueId}_${originalName}`
      : `${folder.toLowerCase()}/${uniqueId}_${originalName}`;

    const { data: uploadData }: { data: B2UploadData } = await b2.getUploadUrl({
      bucketId: bucket.bucketId,
    });

    await b2.uploadFile({
      uploadUrl: uploadData.uploadUrl,
      uploadAuthToken: uploadData.authorizationToken,
      fileName,
      data: fileBuffer,
      mime: mimeType,
    });

    const fileUrl = `https://DCC-Ticketing.s3.us-east-005.backblazeb2.com/${fileName}`;
    return fileUrl;
  } catch (error: any) {
    console.error("❌ Upload to Backblaze failed:", error.message);
    throw error;
  }
};

// ✅ FIXED: Delete file from Backblaze B2
const deleteFromBackblaze = async (fileUrl: string): Promise<boolean> => {
  try {
    // 1. Extract file name from URL
    const url = new URL(fileUrl);
    const fileName = decodeURIComponent(url.pathname.replace(/^\/+/, ""));

    // 2. Authorize with B2
    await b2.authorize();

    // 3. Get bucket
    const bucketName = process.env.BACKBLAZE_B2_BUCKET_NAME;
    if (!bucketName) {
      throw new Error(
        "BACKBLAZE_B2_BUCKET_NAME environment variable is not set"
      );
    }

    const { data: buckets }: { data: B2ListBucketsResponse } =
      await b2.listBuckets();
    const bucket = buckets.buckets.find(
      (b: B2Bucket) => b.bucketName === bucketName
    );

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
    let matchedFile: B2FileVersion | null = null;
    let startFileName: string | undefined = undefined;

    do {
      // ✅ Build options object conditionally
      const listOptions: any = {
        bucketId: bucket.bucketId,
        maxFileCount: 1000,
      };

      // Only add startFileName if it's defined
      if (startFileName !== undefined) {
        listOptions.startFileName = startFileName;
      }

      const { data: fileVersions }: { data: B2ListFileVersionsResponse } =
        await b2.listFileVersions(listOptions);

      // Search through results manually
      matchedFile =
        fileVersions.files.find(
          (f: B2FileVersion) => f.fileName === fileName
        ) || null;

      if (matchedFile) break;

      startFileName = fileVersions.nextFileName;
    } while (startFileName);

    if (!matchedFile) {
      console.error(`❌ File not found in B2: ${fileName}`);
      throw new Error(`File not found in bucket`);
    }

    // 5. Delete the file
    await b2.deleteFileVersion({
      fileName: matchedFile.fileName,
      fileId: matchedFile.fileId,
    });

    console.log(`✅ File deleted successfully: ${fileName}`);
    return true;
  } catch (err: any) {
    console.error("❌ Failed to delete from B2:", err.message);
    throw err;
  }
};

// Export functions
export { uploadToBackblaze, deleteFromBackblaze, testDirectAuth };
