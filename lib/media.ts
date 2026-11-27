import "server-only";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { ApiError } from "@/lib/api-error";

export function cloudinaryEnabled() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET,
  );
}

export async function storeImage(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new ApiError(400, "UPLOAD", "Upload a JPEG, PNG, or WebP image.");
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new ApiError(400, "UPLOAD", "Images must be 5 MB or smaller.");
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  if (cloudinaryEnabled()) {
    const { v2: cloudinary } = await import("cloudinary");
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    const uploaded = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream({ folder: "glide-glance" }, (error, result) => {
        if (error || !result) reject(error ?? new Error("Upload failed"));
        else resolve(result);
      });
      stream.end(bytes);
    });
    return { url: uploaded.secure_url, publicId: uploaded.public_id };
  }

  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const filename = `${crypto.randomUUID()}.${extension}`;
  const directory = path.join(process.cwd(), "public", "uploads");
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, filename), bytes);
  return { url: `/uploads/${filename}`, publicId: null as string | null };
}
