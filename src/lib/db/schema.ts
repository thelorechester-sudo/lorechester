import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * All money is stored as an INTEGER number of rupiah.
 * IDR has no minor unit, and Midtrans rejects non-integer gross_amount.
 * Never introduce a numeric/decimal money column here.
 */

export const productStatus = pgEnum("product_status", [
  "draft",
  "active",
  "archived",
]);

export const orderStatus = pgEnum("order_status", [
  "pending", // awaiting payment
  "paid", // Midtrans settled, stock decremented
  "packed",
  "shipped",
  "delivered",
  "cancelled",
  "expired", // payment window elapsed
]);

export const discountType = pgEnum("discount_type", ["percent", "fixed"]);

export const articleStatus = pgEnum("article_status", ["draft", "published"]);

export const userRole = pgEnum("user_role", ["customer", "admin"]);

/* ------------------------------------------------------------------ */
/* Catalog                                                             */
/* ------------------------------------------------------------------ */

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    /** Free-text care/fabric/fit notes rendered as an accordion on the PDP. */
    details: text("details").notNull().default(""),
    status: productStatus("status").notNull().default("draft"),
    /** Base price in rupiah. Variants may override. */
    price: integer("price").notNull(),
    /** Strikethrough "was" price. Null when not on sale. */
    compareAtPrice: integer("compare_at_price"),
    category: text("category"),
    featured: boolean("featured").notNull().default(false),
    /** Weight in grams — required by Biteship to quote shipping. */
    weightGrams: integer("weight_grams").notNull().default(300),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("products_slug_idx").on(t.slug),
    index("products_status_idx").on(t.status),
  ],
);

export const productImages = pgTable(
  "product_images",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    alt: text("alt").notNull().default(""),
    position: integer("position").notNull().default(0),
  },
  (t) => [index("product_images_product_idx").on(t.productId, t.position)],
);

export const variants = pgTable(
  "variants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    size: text("size").notNull(),
    color: text("color"),
    sku: text("sku"),
    /** Never allowed below zero — enforced in the payment webhook transaction. */
    stock: integer("stock").notNull().default(0),
    /** Overrides products.price when set (e.g. XXL costs more). */
    priceOverride: integer("price_override"),
    position: integer("position").notNull().default(0),
  },
  (t) => [
    uniqueIndex("variants_product_size_color_idx").on(
      t.productId,
      t.size,
      t.color,
    ),
    index("variants_product_idx").on(t.productId),
  ],
);

export const collections = pgTable(
  "collections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    heroImage: text("hero_image"),
    /** Drop date. Future value powers the countdown on the homepage. */
    releaseAt: timestamp("release_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("collections_slug_idx").on(t.slug)],
);

export const productCollections = pgTable(
  "product_collections",
  {
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    collectionId: uuid("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.productId, t.collectionId] })],
);

/* ------------------------------------------------------------------ */
/* Orders                                                              */
/* ------------------------------------------------------------------ */

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Human-facing, shown to the customer: LRC-8F2K3D. */
    orderNumber: text("order_number").notNull(),
    email: text("email").notNull(),
    phone: text("phone").notNull(),
    /** Null for guest checkout. */
    customerId: uuid("customer_id"),
    status: orderStatus("status").notNull().default("pending"),

    subtotal: integer("subtotal").notNull(),
    discountTotal: integer("discount_total").notNull().default(0),
    shippingTotal: integer("shipping_total").notNull().default(0),
    grandTotal: integer("grand_total").notNull(),
    discountCode: text("discount_code"),

    shippingAddress: jsonb("shipping_address").$type<ShippingAddress>().notNull(),
    courier: text("courier"),
    courierService: text("courier_service"),
    trackingNumber: text("tracking_number"),

    /** order_id we hand to Midtrans. Unique — the webhook idempotency key. */
    midtransOrderId: text("midtrans_order_id").notNull(),
    midtransTransactionId: text("midtrans_transaction_id"),
    /** Snap token, so an unpaid order can reopen the payment popup. */
    snapToken: text("snap_token"),
    paymentMethod: text("payment_method"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    /** Set when the payment webhook has already decremented stock. */
    stockCommittedAt: timestamp("stock_committed_at", { withTimezone: true }),

    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("orders_order_number_idx").on(t.orderNumber),
    uniqueIndex("orders_midtrans_order_id_idx").on(t.midtransOrderId),
    index("orders_status_idx").on(t.status, t.createdAt),
    index("orders_email_idx").on(t.email),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    /** Kept nullable: a variant may be deleted long after the order shipped. */
    variantId: uuid("variant_id").references(() => variants.id, {
      onDelete: "set null",
    }),
    /**
     * Snapshots. An order must still render correctly after the product is
     * renamed, repriced, or deleted.
     */
    titleSnapshot: text("title_snapshot").notNull(),
    sizeSnapshot: text("size_snapshot").notNull(),
    imageSnapshot: text("image_snapshot"),
    priceSnapshot: integer("price_snapshot").notNull(),
    qty: integer("qty").notNull(),
  },
  (t) => [index("order_items_order_idx").on(t.orderId)],
);

/* ------------------------------------------------------------------ */
/* Discounts                                                           */
/* ------------------------------------------------------------------ */

export const discounts = pgTable(
  "discounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Always stored uppercase; lookups uppercase the input. */
    code: text("code").notNull(),
    type: discountType("type").notNull(),
    /** percent -> 1..100, fixed -> rupiah */
    value: integer("value").notNull(),
    minSubtotal: integer("min_subtotal").notNull().default(0),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    /** Null = unlimited. */
    usageLimit: integer("usage_limit"),
    usedCount: integer("used_count").notNull().default(0),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("discounts_code_idx").on(t.code)],
);

/* ------------------------------------------------------------------ */
/* Content                                                             */
/* ------------------------------------------------------------------ */

export const articles = pgTable(
  "articles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    excerpt: text("excerpt").notNull().default(""),
    coverImage: text("cover_image"),
    body: text("body").notNull().default(""),
    status: articleStatus("status").notNull().default("draft"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("articles_slug_idx").on(t.slug),
    index("articles_status_idx").on(t.status, t.publishedAt),
  ],
);

export const showcases = pgTable(
  "showcases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    caption: text("caption").notNull().default(""),
    images: jsonb("images").$type<ShowcaseImage[]>().notNull().default([]),
    /** Products worn in the shoot, rendered as "shop the look". */
    linkedProductIds: jsonb("linked_product_ids")
      .$type<string[]>()
      .notNull()
      .default([]),
    published: boolean("published").notNull().default(false),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("showcases_published_idx").on(t.published, t.position)],
);

/* ------------------------------------------------------------------ */
/* Waitlist + accounts                                                 */
/* ------------------------------------------------------------------ */

export const waitlist = pgTable(
  "waitlist",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    phone: text("phone"),
    /** Null product = general drop-announcement signup. */
    productId: uuid("product_id").references(() => products.id, {
      onDelete: "cascade",
    }),
    variantId: uuid("variant_id").references(() => variants.id, {
      onDelete: "cascade",
    }),
    notifiedAt: timestamp("notified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("waitlist_unique_idx").on(t.email, t.productId, t.variantId),
    index("waitlist_product_idx").on(t.productId),
  ],
);

/**
 * Mirrors Supabase `auth.users`. Drizzle does not manage the auth schema, so
 * `userId` is an unenforced reference — Supabase owns that row's lifecycle.
 */
export const profiles = pgTable(
  "profiles",
  {
    userId: uuid("user_id").primaryKey(),
    email: text("email").notNull(),
    fullName: text("full_name"),
    phone: text("phone"),
    role: userRole("role").notNull().default("customer"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("profiles_role_idx").on(t.role)],
);

/* ------------------------------------------------------------------ */
/* Relations                                                           */
/* ------------------------------------------------------------------ */

export const productsRelations = relations(products, ({ many }) => ({
  images: many(productImages),
  variants: many(variants),
  collections: many(productCollections),
}));

export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, {
    fields: [productImages.productId],
    references: [products.id],
  }),
}));

export const variantsRelations = relations(variants, ({ one }) => ({
  product: one(products, {
    fields: [variants.productId],
    references: [products.id],
  }),
}));

export const collectionsRelations = relations(collections, ({ many }) => ({
  products: many(productCollections),
}));

export const productCollectionsRelations = relations(
  productCollections,
  ({ one }) => ({
    product: one(products, {
      fields: [productCollections.productId],
      references: [products.id],
    }),
    collection: one(collections, {
      fields: [productCollections.collectionId],
      references: [collections.id],
    }),
  }),
);

export const ordersRelations = relations(orders, ({ many }) => ({
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  variant: one(variants, {
    fields: [orderItems.variantId],
    references: [variants.id],
  }),
}));

/* ------------------------------------------------------------------ */
/* JSON column shapes                                                  */
/* ------------------------------------------------------------------ */

export type ShippingAddress = {
  recipientName: string;
  phone: string;
  line1: string;
  /** Biteship area id — what we quote and book couriers against. */
  areaId: string;
  /** Human-readable "Kebayoran Baru, Jakarta Selatan, DKI Jakarta" */
  areaLabel: string;
  postalCode: string;
  note?: string;
};

export type ShowcaseImage = {
  url: string;
  alt: string;
};

/* ------------------------------------------------------------------ */
/* Inferred types                                                      */
/* ------------------------------------------------------------------ */

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type ProductImage = typeof productImages.$inferSelect;
export type Variant = typeof variants.$inferSelect;
export type Collection = typeof collections.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type OrderStatus = (typeof orderStatus.enumValues)[number];
export type Discount = typeof discounts.$inferSelect;
export type Article = typeof articles.$inferSelect;
export type Showcase = typeof showcases.$inferSelect;
export type Profile = typeof profiles.$inferSelect;
