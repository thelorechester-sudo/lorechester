import { asc, desc } from "drizzle-orm";
import Link from "next/link";

import { Badge, Button, EmptyState, PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { showcases } from "@/lib/db/schema";
import { DeleteShowcaseButton } from "./delete-button";

export default async function ShowcasePage({
  searchParams,
}: PageProps<"/admin/showcase">) {
  await requireAdmin();

  const { saved } = await searchParams;

  const rows = await db
    .select()
    .from(showcases)
    .orderBy(asc(showcases.position), desc(showcases.createdAt));

  return (
    <>
      <PageHeader
        title="Showcase"
        description="Lookbook shoots. Published entries appear on the homepage and /lookbook."
        action={
          <Link href="/admin/showcase/new">
            <Button>New showcase</Button>
          </Link>
        }
      />

      {saved && (
        <p className="mb-6 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800">
          Showcase saved.
        </p>
      )}

      {rows.length === 0 ? (
        <EmptyState
          title="No showcases yet"
          description="A showcase is a set of shoot images with the products worn in them tagged for one-click buying."
          action={
            <Link href="/admin/showcase/new">
              <Button>New showcase</Button>
            </Link>
          }
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((showcase) => (
            <li
              key={showcase.id}
              className="overflow-hidden rounded-lg border border-line bg-paper-pure"
            >
              <div
                className="h-36 bg-paper bg-cover bg-center"
                style={
                  showcase.images[0]
                    ? { backgroundImage: `url(${showcase.images[0].url})` }
                    : undefined
                }
              />
              <div className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <Link
                    href={`/admin/showcase/${showcase.id}`}
                    className="font-medium hover:underline"
                  >
                    {showcase.title}
                  </Link>
                  <Badge tone={showcase.published ? "positive" : "warning"}>
                    {showcase.published ? "Live" : "Draft"}
                  </Badge>
                </div>
                <p className="text-xs text-muted">
                  {showcase.images.length}{" "}
                  {showcase.images.length === 1 ? "image" : "images"} ·{" "}
                  {showcase.linkedProductIds.length} tagged · order{" "}
                  {showcase.position}
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <Link href={`/admin/showcase/${showcase.id}`}>
                    <Button variant="secondary" size="sm">
                      Edit
                    </Button>
                  </Link>
                  <DeleteShowcaseButton
                    id={showcase.id}
                    title={showcase.title}
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
