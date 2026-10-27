"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { FormErrors } from "@/components/admin/form-errors";
import { LinkList } from "@/components/admin/link-list";
import { Button, Field, Input, Textarea } from "@/components/admin/ui";
import {
  DEFAULT_FOOTER_COLUMNS,
  DEFAULT_NAV,
  DEFAULT_SITE,
  type SiteSettings,
} from "@/lib/site";
import { saveSite, type ActionState } from "./actions";

export type SiteFormValues = Partial<SiteSettings> &
  Pick<SiteSettings, "nav" | "footerColumns">;

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : "Save changes"}
    </Button>
  );
}

/** Pulls "<prefix>.<rest>" errors out of the flat Zod error map. */
function scoped(errors: Record<string, string>, prefix: string) {
  const out: Record<string, string> = {};
  for (const [key, message] of Object.entries(errors)) {
    if (key.startsWith(prefix + ".")) out[key.slice(prefix.length + 1)] = message;
  }
  return out;
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold">{title}</h2>
        {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

export function SiteForm({
  initial,
  envFreeShipping,
}: {
  initial: SiteFormValues;
  envFreeShipping: number;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(saveSite, {
    ok: false,
  });
  const [values, setValues] = useState<SiteFormValues>(initial);
  const [threshold, setThreshold] = useState(
    initial.freeShippingThreshold === undefined
      ? ""
      : String(initial.freeShippingThreshold),
  );

  const errors = state.errors ?? {};
  const set = <K extends keyof SiteFormValues>(key: K, value: SiteFormValues[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const text = (key: keyof SiteFormValues) => (values[key] as string | undefined) ?? "";

  const payload = JSON.stringify({
    ...values,
    freeShippingThreshold: threshold.trim() === "" ? undefined : Number(threshold),
  });

  const columns = values.footerColumns;
  const setColumn = (index: number, patch: Partial<(typeof columns)[number]>) =>
    set(
      "footerColumns",
      columns.map((column, i) => (i === index ? { ...column, ...patch } : column)),
    );

  return (
    <form action={formAction} className="max-w-2xl space-y-12">
      <input type="hidden" name="payload" value={payload} />

      <FormErrors
        errors={errors}
        handled={[
          ...Object.keys(values),
          ...Object.keys(errors).filter(
            (key) => key.startsWith("nav.") || key.startsWith("footerColumns."),
          ),
        ]}
      />

      {state.ok && (
        <p
          role="status"
          className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
        >
          Saved. The storefront is updated.
        </p>
      )}

      <Section
        title="Free shipping"
        hint="Orders at or above this subtotal ship free. This is the amount customers are actually charged against at checkout."
      >
        <Field
          label="Free shipping over (Rp)"
          htmlFor="freeShippingThreshold"
          error={errors.freeShippingThreshold}
          hint={`Whole rupiah. Use 0 to switch the offer off. Empty uses the built-in value (${envFreeShipping > 0 ? `Rp ${envFreeShipping.toLocaleString("id-ID")}` : "off"}).`}
        >
          <Input
            id="freeShippingThreshold"
            type="number"
            inputMode="numeric"
            min={0}
            step={1000}
            value={threshold}
            placeholder={String(envFreeShipping)}
            onChange={(e) => setThreshold(e.target.value)}
          />
        </Field>
      </Section>

      <Section
        title="Header menu"
        hint="The links across the top of the store. “Collection” is hidden automatically while you have no collections."
      >
        <LinkList
          idPrefix="nav"
          links={values.nav}
          onChange={(next) => set("nav", next)}
          errors={scoped(errors, "nav")}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => set("nav", DEFAULT_NAV)}
        >
          Restore built-in menu
        </Button>
      </Section>

      <Section title="Footer text">
        <Field label="About line" htmlFor="footerTagline" error={errors.footerTagline}>
          <Textarea
            id="footerTagline"
            rows={3}
            value={text("footerTagline")}
            placeholder={DEFAULT_SITE.footerTagline}
            onChange={(e) => set("footerTagline", e.target.value)}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Motto" htmlFor="footerMotto" error={errors.footerMotto}>
            <Input
              id="footerMotto"
              value={text("footerMotto")}
              placeholder={DEFAULT_SITE.footerMotto}
              onChange={(e) => set("footerMotto", e.target.value)}
            />
          </Field>
          <Field label="Copyright name" htmlFor="copyrightName" error={errors.copyrightName}>
            <Input
              id="copyrightName"
              value={text("copyrightName")}
              placeholder={DEFAULT_SITE.copyrightName}
              onChange={(e) => set("copyrightName", e.target.value)}
            />
          </Field>
        </div>
        <Field label="Payment methods line" htmlFor="paymentLine" error={errors.paymentLine}>
          <Input
            id="paymentLine"
            value={text("paymentLine")}
            placeholder={DEFAULT_SITE.paymentLine}
            onChange={(e) => set("paymentLine", e.target.value)}
          />
        </Field>
      </Section>

      <Section
        title="Footer links"
        hint="Up to four columns. Each column has its own links."
      >
        <div className="space-y-6">
          {columns.map((column, index) => (
            <div key={index} className="space-y-3 rounded-lg border border-line p-4">
              <div className="flex items-end gap-2">
                <Field
                  label="Column title"
                  htmlFor={`col-${index}`}
                  error={errors[`footerColumns.${index}.title`]}
                  className="flex-1"
                >
                  <Input
                    id={`col-${index}`}
                    value={column.title}
                    onChange={(e) => setColumn(index, { title: e.target.value })}
                  />
                </Field>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={`Remove column ${index + 1}`}
                  onClick={() =>
                    set("footerColumns", columns.filter((_, i) => i !== index))
                  }
                >
                  Remove column
                </Button>
              </div>
              <LinkList
                idPrefix={`col-${index}`}
                links={column.links}
                max={10}
                onChange={(next) => setColumn(index, { links: next })}
                errors={scoped(errors, `footerColumns.${index}.links`)}
              />
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          {columns.length < 4 && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() =>
                set("footerColumns", [...columns, { title: "", links: [] }])
              }
            >
              Add column
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => set("footerColumns", DEFAULT_FOOTER_COLUMNS)}
          >
            Restore built-in footer links
          </Button>
        </div>
      </Section>

      <Section
        title="Contact details"
        hint="Shown in the footer and filled into the Returns, Terms and Privacy pages wherever they say “contact us”."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="WhatsApp number" htmlFor="whatsapp" error={errors.whatsapp} hint="e.g. 0812 3456 7890">
            <Input
              id="whatsapp"
              inputMode="tel"
              value={text("whatsapp")}
              onChange={(e) => set("whatsapp", e.target.value)}
            />
          </Field>
          <Field label="Email" htmlFor="email" error={errors.email}>
            <Input
              id="email"
              type="email"
              value={text("email")}
              onChange={(e) => set("email", e.target.value)}
            />
          </Field>
        </div>
        <Field label="Instagram" htmlFor="instagram" error={errors.instagram} hint="A handle (@lorechester) or a full link.">
          <Input
            id="instagram"
            value={text("instagram")}
            onChange={(e) => set("instagram", e.target.value)}
          />
        </Field>
      </Section>

      <Section
        title="Business details"
        hint="Used on the Terms of service page. Payment providers check that these match your registration."
      >
        <Field label="Legal business name" htmlFor="businessName" error={errors.businessName}>
          <Input
            id="businessName"
            value={text("businessName")}
            onChange={(e) => set("businessName", e.target.value)}
          />
        </Field>
        <Field label="Business address" htmlFor="businessAddress" error={errors.businessAddress}>
          <Textarea
            id="businessAddress"
            rows={2}
            value={text("businessAddress")}
            onChange={(e) => set("businessAddress", e.target.value)}
          />
        </Field>
        <Field label="Registration number (NIB / NPWP)" htmlFor="businessId" error={errors.businessId}>
          <Input
            id="businessId"
            value={text("businessId")}
            onChange={(e) => set("businessId", e.target.value)}
          />
        </Field>
      </Section>

      <div className="sticky bottom-0 -mx-4 flex items-center gap-3 border-t border-line bg-paper-pure/95 px-4 py-4 backdrop-blur sm:-mx-0 sm:px-0">
        <SaveButton />
        <p className="text-xs text-muted">
          Empty text fields keep the built-in wording.
        </p>
      </div>
    </form>
  );
}
