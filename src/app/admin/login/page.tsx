import Link from "next/link";
import { Suspense } from "react";

import { DEMO_MODE } from "@/lib/demo";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <p className="meta text-muted">Lorechester</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Admin sign in
        </h1>

        {DEMO_MODE ? (
          <div className="mt-8 space-y-4 border border-line bg-paper-pure p-5">
            <p className="text-sm">
              The admin needs a real database. You&apos;re running in demo mode,
              which serves fixture data to the storefront only.
            </p>
            <p className="text-sm leading-relaxed text-muted">
              To switch it on: create a Supabase project, fill in{" "}
              <code className="font-mono text-xs">.env.local</code>, remove{" "}
              <code className="font-mono text-xs">NEXT_PUBLIC_DEMO_MODE</code>,
              then run <code className="font-mono text-xs">npm run db:push</code>
              . The full sequence is in{" "}
              <code className="font-mono text-xs">AGENTS.md</code>.
            </p>
            <Link href="/" className="meta inline-block border-b border-ink pb-1">
              Back to the store
            </Link>
          </div>
        ) : (
          <Suspense>
            <LoginForm />
          </Suspense>
        )}
      </div>
    </main>
  );
}
