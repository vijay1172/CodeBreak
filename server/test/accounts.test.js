import assert from "node:assert/strict";
import test from "node:test";
import { hashPassword, verifyPassword } from "../src/accounts.js";
test("passwords are salted, verified, and never stored as plaintext", async () => {
  const first = await hashPassword("a test passphrase");
  const second = await hashPassword("a test passphrase");
  assert.notEqual(first, second);
  assert.ok(!first.includes("a test passphrase"));
  assert.equal(await verifyPassword("a test passphrase", first), true);
  assert.equal(await verifyPassword("the wrong passphrase", first), false);
});
