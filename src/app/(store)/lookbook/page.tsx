import type { Metadata } from "next";

import { ShowcaseBand } from "@/components/store/showcase-band";
import { getPublishedShowcases } from "@/lib/content";

export const metadata: Metadata = {
  title: "Lookbook",
  description: "Lorechester shoots, and the pieces worn in them.",
};

export const dynamic = "force-dynamic";

export default async function LookbookPage() {
  const showcases = await getPublishedShowcases();

  return (
    <div className="pb-10">
      <div className="mx-auto max-w-[1600px] px-5 pt-14 sm:px-8">
        <h1 className="text-headline font-black uppercase">Lookbook</h1>
      </div>

      {showcases.length === 0 ? (
        <p className="mx-auto mt-12 max-w-[1600px] border border-dashed border-line px-6 py-20 text-center text-sm text-muted sm:mx-8">
          No shoots published yet.
        </p>
      ) : (
        showcases.map((showcase) => (
          <ShowcaseBand key={showcase.id} showcase={showcase} />
        ))
      )}
    </div>
  );
}
