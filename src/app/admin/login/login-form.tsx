"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button, Field, Input } from "@/components/admin/ui";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(
    params.get("error") === "forbidden"
      ? "That account is signed in but is not an admin."
      : null,
  );
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const form = new FormData(event.currentTarget);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
    });

    if (authError) {
      /*
       * Stay vague about *credentials* only. Distinguishing "no such user"
       * from "wrong password" hands an attacker a list of valid accounts.
       *
       * Everything else — unreachable host, rejected API key, rate limit — is
       * an operator problem, and reporting it as a bad password sends whoever
       * is debugging it to look in exactly the wrong place. This message did
       * precisely that once already.
       */
      setError(
        authError.code === "invalid_credentials"
          ? "Email or password is incorrect."
          : authError.code === "email_not_confirmed"
            ? "That account exists but its email is not confirmed. Confirm it in the Supabase dashboard."
            : `Sign-in failed (${authError.code ?? authError.status ?? "unknown"}): ${authError.message}`,
      );
      setPending(false);
      return;
    }

    const next = params.get("next");
    router.replace(next?.startsWith("/admin") ? next : "/admin");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-4">
      <Field label="Email" htmlFor="email">
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          autoFocus
        />
      </Field>

      <Field label="Password" htmlFor="password">
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </Field>

      {error && (
        <p role="alert" className="text-sm text-accent">
          {error}
        </p>
      )}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Signing in…" : "Sign in"}
      </Button>

      <p className="text-xs leading-relaxed text-muted">
        Accounts are created in the Supabase dashboard. After signing up, run the
        last query in <code className="font-mono">supabase/setup.sql</code> to
        grant yourself the admin role.
      </p>
    </form>
  );
}
