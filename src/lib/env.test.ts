import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import { missingStoreEnv } from "./env";

const KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "DATABASE_URL",
] as const;

const original = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));

afterEach(() => {
  for (const key of KEYS) {
    if (original[key] === undefined) delete process.env[key];
    else process.env[key] = original[key];
  }
});

function setAll(value: string | undefined) {
  for (const key of KEYS) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

test("reports every required variable when nothing is set", () => {
  // This is the exact state the first Vercel deploy was in: no env vars, and
  // the app returned a bare 500 from middleware on every route.
  setAll(undefined);
  assert.deepEqual(missingStoreEnv().sort(), [...KEYS].sort());
});

test("reports nothing when all three are set", () => {
  setAll("x");
  assert.deepEqual(missingStoreEnv(), []);
});

test("reports only the variable that is actually missing", () => {
  setAll("x");
  delete process.env.DATABASE_URL;
  assert.deepEqual(missingStoreEnv(), ["DATABASE_URL"]);
});

test("treats an empty string as missing", () => {
  // Pasting a blank value into a host's settings is a common mistake and must
  // not read as configured.
  setAll("x");
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "";
  assert.deepEqual(missingStoreEnv(), ["NEXT_PUBLIC_SUPABASE_ANON_KEY"]);
});
