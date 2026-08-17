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
      <div className="flex aspect-[4/5] items-center justify-center rounded-card border border-line bg-paper">
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
                  "relative block aspect-square w-full overflow-hidden rounded-input border border-line bg-paper-pure transition-opacity " +
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

      {/*
       * Not `fill`. With fill + object-contain the img element box is the whole
       * 4/5 frame and the photo is letterboxed inside it, so a radius on the
       * image clips empty white and shows nothing. Explicit width/height only
       * reserve space against layout shift; `h-auto w-auto` makes CSS use the
       * file's natural size scaled to fit, which collapses the element box onto
       * the photo itself — and that is what the radius can then round.
       */}
      <div className="flex aspect-[4/5] min-w-0 flex-1 items-center justify-center overflow-hidden rounded-card border border-line bg-paper-pure p-6">
        <Image
          src={current.url}
          alt={current.alt || title}
          width={1200}
          height={1500}
          priority
          sizes="(max-width: 1024px) 100vw, 560px"
          className="h-auto max-h-full w-auto max-w-full rounded-card object-contain"
        />
      </div>
    </div>
  );
}
