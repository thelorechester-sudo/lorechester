import { z } from "zod";

/*
 * Site-wide editable settings: navigation, footer, contact details, business
 * details and the free-shipping offer. Same contract as @/lib/settings — every
 * field is optional and falls back to DEFAULT_SITE, which is what used to be
 * hardcoded in the header, footer and layout, so an untouched store renders
 * exactly as before. Free of `server-only` and database imports because the
 * admin form needs the defaults.
 */

export const SITE_KEY = "site";

const line = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value ? value : undefined));

/** A site-relative path or an absolute https URL. Never "//host" or "..". */
const href = z
  .string()
  .trim()
  .min(1, "Link address is required")
  .max(300)
  .refine(
    (value) =>
      /^https?:\/\/\S+$/i.test(value) ||
      (/^\/(?!\/)\S*$/.test(value) && !value.includes("..")),
    "Use a path like /shop or a full https:// address",
  );

const linkSchema = z.object({
  label: z.string().trim().min(1, "Link name is required").max(40),
  href,
});

export type SiteLink = z.infer<typeof linkSchema>;

const columnSchema = z.object({
  title: z.string().trim().min(1, "Column title is required").max(30),
  links: z.array(linkSchema).max(10).default([]),
});

export type FooterColumn = z.infer<typeof columnSchema>;

export const siteSettingsSchema = z.object({
  /** Whole rupiah; 0 switches the offer off. Unset uses the env default. */
  freeShippingThreshold: z
    .number()
    .int("Whole rupiah only")
    .min(0)
    .max(100_000_000)
    .optional(),

  footerTagline: line(240),
  footerMotto: line(80),
  paymentLine: line(100),
  copyrightName: line(60),

  whatsapp: line(30),
  email: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((value) => (value ? value : undefined))
    .refine((value) => !value || z.email().safeParse(value).success, "Not a valid email"),
  instagram: line(100),

  businessName: line(120),
  businessAddress: line(240),
  businessId: line(60),

  /** Empty list = use the built-in menu. */
  nav: z.array(linkSchema).max(8).default([]),
  footerColumns: z.array(columnSchema).max(4).default([]),
});

export type SiteSettings = z.infer<typeof siteSettingsSchema>;

export const DEFAULT_NAV: SiteLink[] = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/collections", label: "Collection" },
  { href: "/journal", label: "Journal" },
  { href: "/about", label: "About" },
];

export const DEFAULT_FOOTER_COLUMNS: FooterColumn[] = [
  {
    title: "Shop",
    links: [
      { href: "/shop", label: "All products" },
      { href: "/shop?sort=newest", label: "New arrivals" },
      { href: "/shop?inStock=1", label: "In stock" },
      { href: "/lookbook", label: "Lookbook" },
    ],
  },
  {
    title: "Info",
    links: [
      { href: "/about", label: "About" },
      { href: "/orders/lookup", label: "Track an order" },
      { href: "/shipping-returns", label: "Shipping & returns" },
      { href: "/size-guide", label: "Size guide" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/returns", label: "Returns policy" },
      { href: "/terms", label: "Terms of service" },
      { href: "/privacy", label: "Privacy" },
    ],
  },
];

export const DEFAULT_SITE = {
  footerTagline:
    "Uncommon wear on your terraces. Heavyweight cut-and-sew, printed in small runs, made and shipped from Indonesia.",
  footerMotto: "Jongeren uit Zuidoost-Azië",
  paymentLine: "Pay with QRIS · GoPay · Virtual Account · Card",
  copyrightName: "Lorechester",
} as const;

export type ResolvedSite = {
  freeShippingThreshold: number;
  footerTagline: string;
  footerMotto: string;
  paymentLine: string;
  copyrightName: string;
  whatsapp?: string;
  email?: string;
  instagram?: string;
  businessName?: string;
  businessAddress?: string;
  businessId?: string;
  nav: SiteLink[];
  footerColumns: FooterColumn[];
};

export function resolveSite(
  stored: Partial<SiteSettings>,
  envFreeShipping: number,
): ResolvedSite {
  return {
    freeShippingThreshold: stored.freeShippingThreshold ?? envFreeShipping,
    footerTagline: stored.footerTagline ?? DEFAULT_SITE.footerTagline,
    footerMotto: stored.footerMotto ?? DEFAULT_SITE.footerMotto,
    paymentLine: stored.paymentLine ?? DEFAULT_SITE.paymentLine,
    copyrightName: stored.copyrightName ?? DEFAULT_SITE.copyrightName,
    whatsapp: stored.whatsapp,
    email: stored.email,
    instagram: stored.instagram,
    businessName: stored.businessName,
    businessAddress: stored.businessAddress,
    businessId: stored.businessId,
    nav: stored.nav?.length ? stored.nav : DEFAULT_NAV,
    footerColumns: stored.footerColumns?.length
      ? stored.footerColumns
      : DEFAULT_FOOTER_COLUMNS,
  };
}

/**
 * Values for {{tokens}} in page text. A missing detail shows the same visible
 * bracketed marker the pages carried before this was editable, so nothing
 * silently disappears from a legal page.
 */
export function pageTokens(
  site: ResolvedSite,
  formatMoney: (amount: number) => string,
): Record<string, string | null> {
  return {
    email: site.email ?? "[EMAIL]",
    whatsapp: site.whatsapp ?? "[WHATSAPP NUMBER]",
    business_name: site.businessName ?? "[LEGAL BUSINESS NAME]",
    business_address: site.businessAddress ?? "[BUSINESS ADDRESS]",
    business_id: site.businessId ?? "[NIB / NPWP]",
    // null drops the line entirely when the offer is off.
    free_shipping:
      site.freeShippingThreshold > 0 ? formatMoney(site.freeShippingThreshold) : null,
  };
}

/** Which of the contact details are still missing — drives the admin warning. */
export function missingContactDetails(site: ResolvedSite): string[] {
  return [
    !site.email && "email",
    !site.whatsapp && "WhatsApp number",
    !site.businessName && "business name",
    !site.businessAddress && "business address",
    !site.businessId && "business registration number",
  ].filter((item): item is string => Boolean(item));
}
