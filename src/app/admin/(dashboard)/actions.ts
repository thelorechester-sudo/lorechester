"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

/*
 * no-requireAdmin: signing out drops privilege rather than using it. Guarding
 * it would strand a demoted or expired session on a page it cannot leave.
 */
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
