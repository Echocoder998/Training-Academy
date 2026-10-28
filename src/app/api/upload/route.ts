import { handleUpload, handleUploadPresigned, type HandleUploadBody, type HandleUploadPresignedBody } from "@vercel/blob/client";
import { issueSignedToken } from "@vercel/blob";
import { currentUser } from "@/lib/session";

const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const MAX_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB

async function mustBeAdmin() {
  const me = await currentUser();
  if (me?.role !== "admin") throw new Error("Only admins can upload videos");
}

/**
 * Lets admins send training videos straight from the browser to Vercel Blob.
 * Newer Blob stores connect with BLOB_STORE_ID (presigned uploads); older ones use BLOB_READ_WRITE_TOKEN.
 */
export async function POST(req: Request) {
  const body = await req.json();
  try {
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      return Response.json(await handleUpload({
        body: body as HandleUploadBody,
        request: req,
        onBeforeGenerateToken: async () => {
          await mustBeAdmin();
          return { allowedContentTypes: VIDEO_TYPES, maximumSizeInBytes: MAX_BYTES, addRandomSuffix: true };
        },
      }));
    }
    return Response.json(await handleUploadPresigned({
      body: body as HandleUploadPresignedBody,
      request: req,
      getSignedToken: async (pathname) => {
        await mustBeAdmin();
        const token = await issueSignedToken({ pathname, operations: ["put"], allowedContentTypes: VIDEO_TYPES, maximumSizeInBytes: MAX_BYTES });
        return { token, urlOptions: { allowedContentTypes: VIDEO_TYPES, maximumSizeInBytes: MAX_BYTES } };
      },
    }));
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
