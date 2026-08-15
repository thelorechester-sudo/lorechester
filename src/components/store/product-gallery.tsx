"use client";

import Image from "next/image";
import { useState } from "react";

export type GalleryImage = { url: string; alt: string };

export function ProductGallery({
  images,
  title,
}: {
  images: GalleryImage[];
  title: string;
}) {
  const [active, setActive] = useState(0);

  if (images.length === 0) {
    return (
      <div className="flex aspect-[4/5] items-center justify-center bg-paper">
        <span className="meta text-muted">No image</span>
      </div>
    );
  }

  const current = images[Math.min(active, images.length - 1)];

  return (
    <div className="flex flex-col gap-3 lg:flex-row">
      {images.length > 1 && (
        <ul className="grid grid-cols-5 gap-2 order-last lg:order-first lg:w-16 lg:shrink-0 lg:grid-cols-1">
          {images.map((image, index) => (
            <li key={image.url}>
              <button
                type="button"
                onClick={() => setActive(index)}
                aria-label={`Show image ${index + 1} of ${images.length}`}
                aria-current={index === active}
                className={
                  "relative block aspect-square w-full overflow-hidden bg-paper-pure transition-opacity " +
                  (index === active
                    ? "ring-1 ring-ink"
                    : "opacity-60 hover:opacity-100")
                }
              >
                <Image
                  src={image.url}
                  alt=""
                  fill
                  sizes="64px"
                  className="object-contain"
                />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="relative aspect-[4/5] min-w-0 flex-1 overflow-hidden bg-paper-pure">
        <Image
          src={current.url}
          alt={current.alt || title}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 560px"
          className="object-contain p-6"
        />
      </div>
    </div>
  );
}
