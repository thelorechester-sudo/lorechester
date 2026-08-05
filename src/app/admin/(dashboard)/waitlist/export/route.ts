import { exportWaitlist } from "../actions";

/**
 * Download every waitlist signup as CSV, for importing into a mailing tool.
 *
 * `exportWaitlist` calls `requireAdmin()` itself, so hitting this URL while
 * signed out redirects to the login page rather than leaking the list.
 */
export async function GET() {
  const csv = await exportWaitlist();
  const date = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="lorechester-waitlist-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
