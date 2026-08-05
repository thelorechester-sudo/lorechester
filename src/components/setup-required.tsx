/**
 * Shown instead of a crash when the app has no database configured.
 *
 * A deployment with no environment variables used to throw inside middleware,
 * which took down every route — including static copy pages — and rendered a
 * bare "Internal Server Error" with nothing to act on. This says what is
 * actually wrong.
 *
 * Safe to serve publicly: it lists variable *names*, never values, and it only
 * appears when there is no database behind the site — so there is nothing to
 * protect yet. It disappears as soon as configuration is complete.
 */
export function SetupRequired({ missing }: { missing: string[] }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-ink px-6 py-16 text-paper">
      <div className="w-full max-w-lg">
        <p className="meta text-paper/40">Lorechester</p>
        <h1 className="mt-3 text-3xl font-black uppercase tracking-[-0.03em]">
          Not configured yet
        </h1>

        <p className="mt-5 text-sm leading-relaxed text-paper/70">
          The site is deployed and running, but it has no database to read from.
          These environment variables are missing:
        </p>

        <ul className="mt-5 space-y-1.5 border-l-2 border-accent pl-4">
          {missing.map((name) => (
            <li key={name} className="font-mono text-sm text-paper">
              {name}
            </li>
          ))}
        </ul>

        <div className="mt-8 space-y-3 text-sm leading-relaxed text-paper/60">
          <p>
            Add them in your host&apos;s environment settings — on Vercel that
            is Settings → Environment Variables — then{" "}
            <strong className="text-paper">redeploy</strong>. Values beginning{" "}
            <code className="font-mono text-paper/80">NEXT_PUBLIC_</code> are
            baked in at build time, so saving them alone changes nothing.
          </p>
          <p>
            Locally, copy <code className="font-mono text-paper/80">.env.example</code>{" "}
            to <code className="font-mono text-paper/80">.env.local</code> and
            fill it in, or set{" "}
            <code className="font-mono text-paper/80">NEXT_PUBLIC_DEMO_MODE=1</code>{" "}
            to run against a local database with no accounts at all.
          </p>
          <p>
            Full setup sequence is in{" "}
            <code className="font-mono text-paper/80">AGENTS.md</code>.
          </p>
        </div>
      </div>
    </main>
  );
}
