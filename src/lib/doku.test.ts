import assert from "node:assert/strict";
import { createHash, createHmac } from "node:crypto";
import { test } from "node:test";

import { resolveOutcome, verifyWebhookSignature } from "./doku";

const SECRET = "SK-TESTSECRET123";
const TARGET = "/api/webhooks/doku";

function sign(
  clientId: string,
  requestId: string,
  timestamp: string,
  body: string,
  target = TARGET,
  secret = SECRET,
) {
  const digest = createHash("sha256").update(body, "utf-8").digest("base64");
  const component = [
    `Client-Id:${clientId}`,
    `Request-Id:${requestId}`,
    `Request-Timestamp:${timestamp}`,
    `Request-Target:${target}`,
    `Digest:${digest}`,
  ].join("\n");

  const hmac = createHmac("sha256", secret).update(component).digest("base64");
  return `HMACSHA256=${hmac}`;
}

const BODY = '{"order":{"invoice_number":"LRC-ABC123","amount":498000}}';
const HEADERS = {
  clientId: "MCH-0001-TEST",
  requestId: "req-1",
  requestTimestamp: "2026-01-01T00:00:00Z",
};

test("a correctly signed notification verifies", () => {
  const signature = sign(
    HEADERS.clientId,
    HEADERS.requestId,
    HEADERS.requestTimestamp,
    BODY,
  );

  assert.equal(
    verifyWebhookSignature({ ...HEADERS, signature }, BODY, TARGET, SECRET),
    true,
  );
});

test("a forged signature is rejected", () => {
  assert.equal(
    verifyWebhookSignature(
      { ...HEADERS, signature: "HMACSHA256=" + "A".repeat(44) },
      BODY,
      TARGET,
      SECRET,
    ),
    false,
  );
});

test("tampering with the body invalidates the signature", () => {
  const signature = sign(
    HEADERS.clientId,
    HEADERS.requestId,
    HEADERS.requestTimestamp,
    BODY,
  );

  const tampered = '{"order":{"invoice_number":"LRC-ABC123","amount":1}}';
  assert.equal(
    verifyWebhookSignature({ ...HEADERS, signature }, tampered, TARGET, SECRET),
    false,
  );
});

test("a signature computed for a different path is rejected", () => {
  // Guards against a signature lifted from a different notification/endpoint.
  const signature = sign(
    HEADERS.clientId,
    HEADERS.requestId,
    HEADERS.requestTimestamp,
    BODY,
    "/some/other/path",
  );

  assert.equal(
    verifyWebhookSignature({ ...HEADERS, signature }, BODY, TARGET, SECRET),
    false,
  );
});

test("a missing signature is rejected", () => {
  assert.equal(
    verifyWebhookSignature({ ...HEADERS, signature: "" }, BODY, TARGET, SECRET),
    false,
  );
});

test("the wrong secret key does not verify", () => {
  const signature = sign(
    HEADERS.clientId,
    HEADERS.requestId,
    HEADERS.requestTimestamp,
    BODY,
  );

  assert.equal(
    verifyWebhookSignature(
      { ...HEADERS, signature },
      BODY,
      TARGET,
      "SK-DIFFERENT",
    ),
    false,
  );
});

test("SUCCESS means paid", () => {
  assert.equal(resolveOutcome("SUCCESS"), "paid");
});

test("PENDING and EXPIRED map as expected", () => {
  assert.equal(resolveOutcome("PENDING"), "pending");
  assert.equal(resolveOutcome("EXPIRED"), "expired");
});

test("FAILED maps to failed", () => {
  assert.equal(resolveOutcome("FAILED"), "failed");
});

test("an unknown status is treated as pending, never as paid", () => {
  assert.equal(resolveOutcome("SOMETHING_NEW"), "pending");
});
