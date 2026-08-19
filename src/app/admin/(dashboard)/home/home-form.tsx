"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { FormErrors } from "@/components/admin/form-errors";
import { ImageManager, type ManagedImage } from "@/components/admin/image-manager";
import { Button, Field, Input, Textarea } from "@/components/admin/ui";
import { DEFAULT_HOME, type HomeSettings } from "@/lib/settings";
import { saveHome, type ActionState } from "./actions";

/**
 * Every field is optional. The placeholder shows the built-in wording, so an
 * empty box visibly means "use the default" rather than "render nothing" —
 * clearing a field restores the shipped copy instead of blanking a section.
 */
export type HomeFormValues = Partial<HomeSettings> & { marquee: string[] };

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : "Save changes"}
    </Button>
  );
}

function one(images: ManagedImage[]): string | undefined {
  return images[0]?.url;
}

function toManaged(url: string | undefined): ManagedImage[] {
  return url ? [{ url, alt: "" }] : [];
}

export function HomeForm({ initial }: { initial: HomeFormValues }) {
  const [state, formAction] = useActionState<ActionState, FormData>(saveHome, {
    ok: false,
  });
  const [values, setValues] = useState<HomeFormValues>(initial);

  const errors = state.errors ?? {};
  const set = <K extends keyof HomeFormValues>(
    key: K,
    value: HomeFormValues[K],
  ) => setValues((prev) => ({ ...prev, [key]: value }));

  const payload = JSON.stringify({
    ...values,
    // The textarea edits one line per message; empty lines are dropped.
    marquee: values.marquee.filter((entry) => entry.trim().length > 0),
  });

  return (
    <form action={formAction} className="max-w-2xl space-y-10">
      <input type="hidden" name="payload" value={payload} />

      <FormErrors errors={errors} handled={Object.keys(values)} />

      {state.ok && (
        <p
          role="status"
          className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
        >
          Saved. The storefront is updated.
        </p>
      )}

      <section className="space-y-4">
        <h2 className="text-sm font-semibold">Ticker</h2>
        <Field
          label="Marquee messages"
          htmlFor="marquee"
          error={errors.marquee}
          hint="One per line. The free-shipping line is added automatically. Leave empty for the defaults."
        >
          <Textarea
            id="marquee"
            rows={4}
            value={values.marquee.join("\n")}
            placeholder={DEFAULT_HOME.marquee.join("\n")}
            onChange={(e) => set("marquee", e.target.value.split("\n"))}
          />
        </Field>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold">Hero</h2>
        <p className="text-xs text-muted">
          The headline and description come from the newest collection — edit
          them under Collections. These control the rest.
        </p>

        <Field label="Eyebrow" htmlFor="heroEyebrow" error={errors.heroEyebrow}>
          <Input
            id="heroEyebrow"
            value={values.heroEyebrow ?? ""}
            placeholder={DEFAULT_HOME.heroEyebrow}
            onChange={(e) => set("heroEyebrow", e.target.value)}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Primary button"
            htmlFor="heroPrimaryCta"
            error={errors.heroPrimaryCta}
          >
            <Input
              id="heroPrimaryCta"
              value={values.heroPrimaryCta ?? ""}
              placeholder={DEFAULT_HOME.heroPrimaryCta}
              onChange={(e) => set("heroPrimaryCta", e.target.value)}
            />
          </Field>
          <Field
            label="Secondary button"
            htmlFor="heroSecondaryCta"
            error={errors.heroSecondaryCta}
          >
            <Input
              id="heroSecondaryCta"
              value={values.heroSecondaryCta ?? ""}
              placeholder={DEFAULT_HOME.heroSecondaryCta}
              onChange={(e) => set("heroSecondaryCta", e.target.value)}
            />
          </Field>
        </div>

        <Field
          label="Hero image override"
          htmlFor="heroImage"
          error={errors.heroImage}
          hint="Optional. Falls back to the newest collection's hero image."
        >
          <ImageManager
            folder="home"
            max={1}
            images={toManaged(values.heroImage)}
            onChange={(next) => set("heroImage", one(next))}
          />
        </Field>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold">Featured section</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Heading"
            htmlFor="featuredHeading"
            error={errors.featuredHeading}
          >
            <Input
              id="featuredHeading"
              value={values.featuredHeading ?? ""}
              placeholder={DEFAULT_HOME.featuredHeading}
              onChange={(e) => set("featuredHeading", e.target.value)}
            />
          </Field>
          <Field
            label="Link label"
            htmlFor="featuredLinkLabel"
            error={errors.featuredLinkLabel}
          >
            <Input
              id="featuredLinkLabel"
              value={values.featuredLinkLabel ?? ""}
              placeholder={DEFAULT_HOME.featuredLinkLabel}
              onChange={(e) => set("featuredLinkLabel", e.target.value)}
            />
          </Field>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold">Editorial band</h2>

        <Field
          label="Eyebrow"
          htmlFor="editorialEyebrow"
          error={errors.editorialEyebrow}
        >
          <Input
            id="editorialEyebrow"
            value={values.editorialEyebrow ?? ""}
            placeholder={DEFAULT_HOME.editorialEyebrow}
            onChange={(e) => set("editorialEyebrow", e.target.value)}
          />
        </Field>

        <Field
          label="Heading"
          htmlFor="editorialHeading"
          error={errors.editorialHeading}
          hint="Line breaks are kept."
        >
          <Textarea
            id="editorialHeading"
            rows={2}
            value={values.editorialHeading ?? ""}
            placeholder={DEFAULT_HOME.editorialHeading}
            onChange={(e) => set("editorialHeading", e.target.value)}
          />
        </Field>

        <Field
          label="Body"
          htmlFor="editorialBody"
          error={errors.editorialBody}
        >
          <Textarea
            id="editorialBody"
            rows={4}
            value={values.editorialBody ?? ""}
            placeholder={DEFAULT_HOME.editorialBody}
            onChange={(e) => set("editorialBody", e.target.value)}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Link label"
            htmlFor="editorialCta"
            error={errors.editorialCta}
          >
            <Input
              id="editorialCta"
              value={values.editorialCta ?? ""}
              placeholder={DEFAULT_HOME.editorialCta}
              onChange={(e) => set("editorialCta", e.target.value)}
            />
          </Field>
          <Field
            label="Link target"
            htmlFor="editorialHref"
            error={errors.editorialHref}
          >
            <Input
              id="editorialHref"
              value={values.editorialHref ?? ""}
              placeholder={DEFAULT_HOME.editorialHref}
              onChange={(e) => set("editorialHref", e.target.value)}
            />
          </Field>
        </div>

        <Field
          label="Band image override"
          htmlFor="editorialImage"
          error={errors.editorialImage}
          hint="Optional. Falls back to the second featured product's image."
        >
          <ImageManager
            folder="home"
            max={1}
            images={toManaged(values.editorialImage)}
            onChange={(next) => set("editorialImage", one(next))}
          />
        </Field>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold">Drop list</h2>
        <Field label="Heading" htmlFor="dropHeading" error={errors.dropHeading}>
          <Input
            id="dropHeading"
            value={values.dropHeading ?? ""}
            placeholder={DEFAULT_HOME.dropHeading}
            onChange={(e) => set("dropHeading", e.target.value)}
          />
        </Field>
        <Field label="Body" htmlFor="dropBody" error={errors.dropBody}>
          <Textarea
            id="dropBody"
            rows={3}
            value={values.dropBody ?? ""}
            placeholder={DEFAULT_HOME.dropBody}
            onChange={(e) => set("dropBody", e.target.value)}
          />
        </Field>
      </section>

      <div className="flex items-center gap-3 border-t border-line pt-6">
        <SaveButton />
        <Button
          type="button"
          variant="secondary"
          onClick={() => setValues({ marquee: [] })}
        >
          Reset all to defaults
        </Button>
      </div>
    </form>
  );
}
