import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";

import { resolveOutcome, verifyNotificationSignature } from "./midtrans";

const SERVER_KEY = "SB-Mid-server-TESTKEY123";

function sign(orderId: string, statusCode: string, grossAmount: string) {
  return createHash("sha512")
    .update(orderId + statusCode + grossAmount + SERVER_KEY)
    .digest("hex");
}

test("a correctly signed notification verifies", () => {
  const payload = {
    order_id: "LRC-ABC123",
    status_code: "200",
    gross_amount: "498000.00",
  };

  assert.equal(
    verifyNotificationSignature(
      { ...payload, signature_key: sign("LRC-ABC123", "200", "498000.00") },
      SERVER_KEY,
    ),
    true,
  );
});

test("a forged signature is rejected", () => {
  assert.equal(
    verifyNotificationSignature(
      {
        order_id: "LRC-ABC123",
        status_code: "200",
        gross_amount: "498000.00",
        signature_key: "0".repeat(128),
      },
      SERVER_KEY,
    ),
    false,
  );
});

test("a signature valid for a different order is rejected", () => {
  // Replaying another order's notification must not settle this one.
  assert.equal(
    verifyNotificationSignature(
      {
        order_id: "LRC-VICTIM",
        status_code: "200",
        gross_amount: "498000.00",
        signature_key: sign("LRC-ATTACKER", "200", "498000.00"),
      },
      SERVER_KEY,
    ),
    false,
  );
});

test("tampering with the amount invalidates the signature", () => {
  assert.equal(
    verifyNotificationSignature(
      {
        order_id: "LRC-ABC123",
        status_code: "200",
        gross_amount: "1.00",
        signature_key: sign("LRC-ABC123", "200", "498000.00"),
      },
      SERVER_KEY,
    ),
    false,
  );
});

test("a missing or empty signature is rejected", () => {
  assert.equal(
    verifyNotificationSignature(
      {
        order_id: "LRC-ABC123",
        status_code: "200",
        gross_amount: "498000.00",
        signature_key: "",
      },
      SERVER_KEY,
    ),
    false,
  );
});

test("the wrong server key does not verify", () => {
  assert.equal(
    verifyNotificationSignature(
      {
        order_id: "LRC-ABC123",
        status_code: "200",
        gross_amount: "498000.00",
        signature_key: sign("LRC-ABC123", "200", "498000.00"),
      },
      "SB-Mid-server-DIFFERENT",
    ),
    false,
  );
});

test("settlement means paid", () => {
  assert.equal(resolveOutcome({ transaction_status: "settlement" }), "paid");
});

test("a card capture only counts once fraud review accepts it", () => {
  assert.equal(
    resolveOutcome({ transaction_status: "capture", fraud_status: "accept" }),
    "paid",
  );
  assert.equal(
    resolveOutcome({ transaction_status: "capture", fraud_status: "challenge" }),
    "pending",
  );
  assert.equal(resolveOutcome({ transaction_status: "capture" }), "pending");
});

test("failure states map to failed or expired", () => {
  assert.equal(resolveOutcome({ transaction_status: "expire" }), "expired");
  assert.equal(resolveOutcome({ transaction_status: "deny" }), "failed");
  assert.equal(resolveOutcome({ transaction_status: "cancel" }), "failed");
});

test("an unknown status is treated as pending, never as paid", () => {
  assert.equal(
    resolveOutcome({ transaction_status: "something_new" }),
    "pending",
  );
});
