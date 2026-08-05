"use client";

import Image from "next/image";
import { useRef, useState } from "react";

import { Button, Input, cx } from "@/components/admin/ui";
import { createClient } from "@/lib/supabase/client";
import { MEDIA_BUCKET, checkUpload, uploadPath } from "@/lib/storage";

export type ManagedImage = {
  id?: string;
  url: string;
  alt: string;
};

/**
 * Upload, caption and order images. Files go straight from the browser to
 * Supabase Storage, so large photos never pass through the Next server.
 *
 * Reordering uses buttons rather than drag-and-drop: it is a fraction of the
 * code and works with a keyboard and a screen reader for free.
 */
export function ImageManager({
  folder,
  images,
  onChange,
  max = 12,
}: {
  folder: string;
  images: ManagedImage[];
  onChange: (next: ManagedImage[]) => void;
  max?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setError(null);

    const picked = Array.from(files).slice(0, max - images.length);
    for (const file of picked) {
      const problem = checkUpload(file);
      if (problem) {
        setError(problem);
        return;
      }
    }

    setBusy(true);
    const supabase = createClient();
    const uploaded: ManagedImage[] = [];

    for (const file of picked) {
      const path = uploadPath(folder, file.name);
      const { error: uploadError } = await supabase.storage
        .from(MEDIA_BUCKET)
        .upload(path, file, { cacheControl: "31536000", upsert: false });

      if (uploadError) {
        setError(
          `Upload failed: ${uploadError.message}. Check that your account has the admin role.`,
        );
        break;
      }

      const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);
      uploaded.push({ url: data.publicUrl, alt: "" });
    }

    if (uploaded.length) onChange([...images, ...uploaded]);
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= images.length) return;
    const next = [...images];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          multiple
          className="hidden"
          onChange={(event) => handleFiles(event.target.files)}
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={busy || images.length >= max}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? "Uploading…" : "Upload images"}
        </Button>
        <span className="text-xs text-muted">
          {images.length}/{max} · first image is the cover
        </span>
      </div>

      {error && (
        <p role="alert" className="text-xs text-accent">
          {error}
        </p>
      )}

      {images.length > 0 && (
        <ul className="space-y-2">
          {images.map((image, index) => (
            <li
              key={image.url}
              className="flex items-start gap-3 rounded-md border border-line bg-paper-pure p-2"
            >
              <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded bg-paper">
                <Image
                  src={image.url}
                  alt=""
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              </div>

              <div className="min-w-0 flex-1 space-y-1.5">
                <Input
                  aria-label={`Alt text for image ${index + 1}`}
                  placeholder="Describe the image for screen readers and SEO"
                  value={image.alt}
                  onChange={(event) => {
                    const next = [...images];
                    next[index] = { ...image, alt: event.target.value };
                    onChange(next);
                  }}
                />
                {index === 0 && (
                  <p className="meta text-muted">Cover</p>
                )}
              </div>

              <div className="flex shrink-0 flex-col gap-1">
                <button
                  type="button"
                  aria-label={`Move image ${index + 1} up`}
                  disabled={index === 0}
                  onClick={() => move(index, index - 1)}
                  className={cx(
                    "rounded border border-line px-2 text-xs leading-6",
                    index === 0 ? "opacity-30" : "hover:bg-paper",
                  )}
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label={`Move image ${index + 1} down`}
                  disabled={index === images.length - 1}
                  onClick={() => move(index, index + 1)}
                  className={cx(
                    "rounded border border-line px-2 text-xs leading-6",
                    index === images.length - 1 ? "opacity-30" : "hover:bg-paper",
                  )}
                >
                  ↓
                </button>
                <button
                  type="button"
                  aria-label={`Remove image ${index + 1}`}
                  onClick={() => onChange(images.filter((_, i) => i !== index))}
                  className="rounded border border-line px-2 text-xs leading-6 text-accent hover:bg-accent-soft"
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
