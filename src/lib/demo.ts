import type {
  Collection,
  Product,
  ProductImage,
  Showcase,
  Variant,
} from "@/lib/db/schema";

/**
 * Demo mode — browse the storefront with no database.
 *
 * Set NEXT_PUBLIC_DEMO_MODE=1 in .env.local and every read falls back to the
 * fixtures below instead of querying Postgres. Writes (checkout, waitlist,
 * admin) are refused rather than faked, so nothing here can be mistaken for a
 * working store.
 *
 * Images are the real brand assets in /public, pulled from the ASSET drive.
 * Product names, prices, stock and copy are placeholders — replace them from
 * the admin once the database is connected.
 *
 * Delete this file and the `if (DEMO_MODE)` guards when you no longer need it.
 */
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "1";

const NOW = new Date("2026-01-15T00:00:00Z");

/**
 * Stable, RFC-4122-shaped v4 UUID derived from a seed, so the cart survives a
 * page reload in demo mode.
 *
 * Hashed rather than hex-encoded: encoding the raw string and truncating to 32
 * characters collides whenever two slugs share their first 16 characters —
 * which `no-city-humbles-us-white` and `-black` do. The version and variant
 * nibbles are forced so `z.uuid()` accepts these in the cart schema.
 */
function id(seed: string, n: number): string {
  const input = `${seed}#${n}`;
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  let h3 = 0x9e3779b9;
  let h4 = 0x85ebca6b;

  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 16777619) >>> 0;
    h2 = Math.imul(h2 + c, 2246822519) >>> 0;
    h3 = Math.imul(h3 ^ (c + i), 3266489917) >>> 0;
    h4 = Math.imul(h4 + c * (i + 1), 668265263) >>> 0;
  }

  const hex = [h1, h2, h3, h4]
    .map((v) => v.toString(16).padStart(8, "0"))
    .join("");

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `4${hex.slice(13, 16)}`, // version 4
    `${"89ab"[parseInt(hex[16], 16) % 4]}${hex.slice(17, 20)}`, // variant
    hex.slice(20, 32),
  ].join("-");
}

const CARE =
  "100% combed cotton, 24s. Machine wash cold, inside out. Hang dry in shade. Do not tumble, do not iron the print.";

type Spec = {
  slug: string;
  /** Article code from the ASSET drive. */
  sku: string;
  title: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  category: string;
  featured: boolean;
  images: { url: string; alt: string }[];
  sizes: string[];
  /** stock per size, same order as `sizes` */
  stock: number[];
};

const SPECS: Spec[] = [
  {
    slug: "goal-tee-white",
    sku: "SOG-1125",
    title: "Goal Tee — White",
    description:
      "Two-colour screen print on a heavyweight white body: a goalmouth scramble under the Lorechester arch, captioned the most underrated wearable goods on your sporting game. Boxy cut, dropped shoulder.",
    price: 265_000,
    category: "T-Shirts",
    featured: true,
    images: [
      { url: "/lookbook/goal-04.jpg", alt: "Goal Tee, front print" },
      { url: "/lookbook/goal-01.jpg", alt: "Goal Tee worn at night" },
      { url: "/lookbook/goal-11.jpg", alt: "Goal Tee, full length" },
      { url: "/lookbook/goal-05.jpg", alt: "Goal Tee, street" },
    ],
    sizes: ["S", "M", "L", "XL", "2XL"],
    stock: [0, 6, 8, 4, 0],
  },
  {
    slug: "no-city-humbles-us-white",
    sku: "NCHU-0126",
    title: "No City Humbles Us — White",
    description:
      "Chest badge front, full back print reading NO CITY HUMBLES US / Lorechester Troops. The one that started the Undominated Troublehood run.",
    price: 245_000,
    category: "T-Shirts",
    featured: true,
    images: [
      { url: "/lookbook/nchu-05.jpg", alt: "No City Humbles Us in white, front" },
      { url: "/lookbook/nchu-08.jpg", alt: "Back print, white colourway" },
      { url: "/products/nchu-white-back.png", alt: "Back print artwork" },
      { url: "/lookbook/nchu-10.jpg", alt: "Worn on the street" },
    ],
    sizes: ["S", "M", "L", "XL", "2XL", "3XL"],
    stock: [3, 7, 9, 5, 2, 0],
  },
  {
    slug: "no-city-humbles-us-black",
    sku: "NCHU-0126-BLK",
    title: "No City Humbles Us — Black",
    description:
      "Same badge and back print on a black body. Reactive-dyed so it stays black through the wash rather than fading to grey.",
    price: 245_000,
    category: "T-Shirts",
    featured: true,
    images: [
      { url: "/lookbook/nchu-04.jpg", alt: "No City Humbles Us in black, front" },
      { url: "/lookbook/nchu-07.jpg", alt: "Back print, black colourway" },
      { url: "/products/nchu-black-back.png", alt: "Back print artwork" },
      { url: "/lookbook/nchu-02.jpg", alt: "Both colourways" },
    ],
    sizes: ["S", "M", "L", "XL", "2XL", "3XL"],
    stock: [2, 5, 6, 6, 3, 1],
  },
  {
    slug: "compass-tee",
    sku: "CPS-825",
    title: "Compass Tee — First-Born Article",
    description:
      "The first article we ever cut. Compass rose across the back, THE LORE CHESTER block on the chest. Across the borderline.",
    price: 225_000,
    compareAtPrice: 275_000,
    category: "T-Shirts",
    featured: true,
    images: [
      { url: "/products/compass-white.jpg", alt: "Compass Tee, white, front and back" },
      { url: "/products/compass-navy.jpg", alt: "Compass Tee, navy, front and back" },
      { url: "/products/compass-print.png", alt: "Compass rose back print" },
    ],
    sizes: ["S", "M", "L", "XL", "2XL"],
    stock: [4, 4, 3, 2, 0],
  },
  {
    slug: "casuals-tee",
    sku: "CSL-001",
    title: "Casuals Tee",
    description:
      "A full firm of scooter boys across the chest — parkas, trainers, Vespas. Stay proper for any occasion.",
    price: 255_000,
    category: "T-Shirts",
    featured: true,
    images: [
      { url: "/products/casuals-pair.png", alt: "Casuals Tee in black and white" },
      { url: "/products/casuals-print.png", alt: "Casuals illustration" },
    ],
    sizes: ["S", "M", "L", "XL", "2XL"],
    stock: [5, 8, 7, 3, 1],
  },
  {
    slug: "clash-division-tee",
    sku: "TCD-001",
    title: "The Clash Division",
    description:
      "Throwing Punch Specialist. Illegal-passport label artwork, printed large on the back and stamped small on the chest.",
    price: 265_000,
    category: "T-Shirts",
    featured: false,
    images: [
      { url: "/products/clash-print.png", alt: "The Clash Division artwork" },
      { url: "/products/clash-green.png", alt: "Throwing Punch, green colourway" },
      { url: "/brand/label-clash.png", alt: "Clash Division woven label" },
    ],
    sizes: ["S", "M", "L", "XL"],
    stock: [2, 3, 4, 2],
  },
  {
    slug: "typeface-tee",
    sku: "CSG-001",
    title: "Crazy Sporting Game Tee",
    description:
      "Stacked LORECHESTER typeface built out of footballs, boots and terrace debris. Crazy sporting game called football.",
    price: 235_000,
    category: "T-Shirts",
    featured: false,
    images: [
      { url: "/products/typeface-print.png", alt: "Stacked typeface artwork" },
      { url: "/lookbook/goal-08.jpg", alt: "Worn on the terraces" },
    ],
    sizes: ["S", "M", "L", "XL"],
    stock: [3, 5, 5, 4],
  },
  {
    slug: "acab-sticker-pack",
    sku: "FWC-026",
    title: "Sticker Pack — All Cats Are Ballers",
    description:
      "Six vinyl stickers. Weatherproof, cut to shape, sized for a laptop lid or the back of an away-end seat.",
    price: 45_000,
    category: "Accessories",
    featured: false,
    images: [{ url: "/products/fwc-sticker.png", alt: "Sticker pack artwork" }],
    sizes: ["One Size"],
    stock: [24],
  },
];

export type DemoProduct = Product & {
  images: ProductImage[];
  variants: Variant[];
};

export const demoProducts: DemoProduct[] = SPECS.map((spec, index) => {
  const productId = id(spec.slug, 0);

  return {
    id: productId,
    slug: spec.slug,
    title: spec.title,
    description: spec.description,
    details: CARE,
    status: "active",
    price: spec.price,
    compareAtPrice: spec.compareAtPrice ?? null,
    category: spec.category,
    featured: spec.featured,
    weightGrams: spec.category === "Accessories" ? 50 : 300,
    createdAt: new Date(NOW.getTime() - index * 86_400_000),
    updatedAt: NOW,
    images: spec.images.map((image, n) => ({
      id: id(`${spec.slug}-img`, n),
      productId,
      url: image.url,
      alt: image.alt,
      position: n,
    })),
    variants: spec.sizes.map((size, n) => ({
      id: id(`${spec.slug}-var`, n),
      productId,
      size,
      color: null,
      sku: `${spec.sku}-${size}`,
      stock: spec.stock[n],
      priceOverride: null,
      position: n,
    })),
  };
});

export const demoCollections: Collection[] = [
  {
    id: id("collection", 0),
    slug: "nchu-0126",
    title: "No City Humbles Us",
    description:
      "Article NCHU-0126. Shot across one afternoon between a studio wall and the back seat of a Corolla.",
    heroImage: "/lookbook/nchu-11.jpg",
    releaseAt: null,
    createdAt: NOW,
  },
  {
    id: id("collection", 1),
    slug: "sporting-goods",
    title: "Sporting Goods",
    description:
      "The football articles — goalmouths, typefaces and the crazy sporting game itself.",
    heroImage: "/lookbook/goal-02.jpg",
    releaseAt: null,
    createdAt: new Date(NOW.getTime() - 86_400_000),
  },
];

export const demoShowcases: Showcase[] = [
  {
    id: id("showcase", 0),
    title: "No City Humbles Us",
    caption:
      "NCHU-0126, shot in Bandung. Studio wall for the fit, the back of the car for everything else.",
    images: [
      { url: "/lookbook/nchu-06.jpg", alt: "In the car, white tee" },
      { url: "/lookbook/nchu-07.jpg", alt: "Back print, black tee" },
      { url: "/lookbook/nchu-12.jpg", alt: "Street, evening" },
    ],
    linkedProductIds: [demoProducts[1].id, demoProducts[2].id],
    published: true,
    position: 0,
    createdAt: NOW,
  },
  {
    id: id("showcase", 1),
    title: "Night Run",
    caption:
      "The Goal Tee, photographed on flash after dark. Nothing styled, nothing borrowed.",
    images: [
      { url: "/lookbook/goal-02.jpg", alt: "Goal Tee against a car at night" },
      { url: "/lookbook/goal-05.jpg", alt: "Alley, flash" },
      { url: "/lookbook/goal-13.jpg", alt: "Full length" },
    ],
    linkedProductIds: [demoProducts[0].id, demoProducts[6].id],
    published: true,
    position: 1,
    createdAt: new Date(NOW.getTime() - 86_400_000),
  },
];

export const demoArticles = [
  {
    id: id("article", 0),
    slug: "uncommon-wear-on-your-terraces",
    title: "Uncommon wear on your terraces",
    excerpt:
      "Why an Indonesian label prints Dutch on its labels, and what terrace culture looks like eleven thousand kilometres from a terrace.",
    coverImage: "/lookbook/goal-09.jpg",
    body: `Jongeren uit Zuidoost-Azië. Youth from Southeast Asia. It sits on the neck tag of nearly everything we make, and it is the shortest way to explain what Lorechester is.

## Borrowed, not copied

Terrace culture came out of English football grounds in the seventies — parkas, trainers, and dressing better than the firm across the pitch. It travelled. It went to Italy, it went to the Netherlands, and eventually it got here.

We are not pretending to be from Manchester. The name is a joke about that, if you look at it long enough. What we take is the discipline of it: a small number of pieces, made properly, worn until they fall apart.

## The articles

Every design gets a code before it gets a name. CPS-825 was the compass — the first article we ever cut. NCHU-0126 became No City Humbles Us. TCD-001 is the Clash Division label, which started as a sticker and ended up as a shirt.

The codes are not branding. They are how we keep track of what was printed, in what run, and how many are left.

## Small runs, on purpose

A run is two hundred pieces at most. That is a worse unit price than two thousand and we accept it, because the alternative is a warehouse full of the same shirt in 3XL.

When a size goes, it usually stays gone. The list on the product page is the only warning you get.`,
    status: "published" as const,
    publishedAt: new Date("2026-01-10T00:00:00Z"),
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: id("article", 1),
    slug: "between-the-stone-steel-and-stitch",
    title: "Between the stone, steel, and stitch",
    excerpt:
      "What goes into a Lorechester Outwear piece, from the woven label to the 240gsm body.",
    coverImage: "/lookbook/nchu-13.jpg",
    body: `Between the stone, steel, and stitch. It is stamped on the outwear roundel, around a castle on a hill, and it is a fair description of how the heavier pieces get made.

## The body

240gsm combed cotton, knitted locally. Heavier than the 180gsm most local brands use. It costs more, it holds a print without curling, and it does not go transparent after a summer.

## The trims

Woven main label, printed neck tag, a wash tag that actually lists what the fabric is. None of that shows in a photograph and all of it is the difference between a shirt and a blank with something printed on it.

## The print

Screen print, two to four colours, cured properly. We do not do DTG. It costs more per piece at our run sizes and it does not survive the way a screen print does.`,
    status: "published" as const,
    publishedAt: new Date("2025-12-02T00:00:00Z"),
    createdAt: NOW,
    updatedAt: NOW,
  },
];

/** Flattened lookup for cart pricing. */
export function findDemoVariant(variantId: string) {
  for (const product of demoProducts) {
    const variant = product.variants.find((v) => v.id === variantId);
    if (variant) return { product, variant };
  }
  return null;
}
