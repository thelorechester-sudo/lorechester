/** Public Supabase Storage bucket. Created by supabase/setup.sql. */
export const MEDIA_BUCKET = "media";

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 MB

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];

/**
 * Client-side pre-flight for uploads. This is UX, not security — the real gate
 * is the `media_admin_write` storage policy in supabase/setup.sql.
 * Returns an error message, or null when the file is acceptable.
 */
export function checkUpload(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return `${file.name}: only JPEG, PNG, WebP and AVIF images are allowed.`;
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return `${file.name}: larger than 8 MB. Compress it first.`;
  }
  return null;
}

/** Collision-proof object path. */
export function uploadPath(folder: string, fileName: string): string {
  const ext = fileName.includes(".")
    ? fileName.split(".").pop()!.toLowerCase().replace(/[^a-z0-9]/g, "")
    : "jpg";
  return `${folder}/${crypto.randomUUID()}.${ext}`;
}
