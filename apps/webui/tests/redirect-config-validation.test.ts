import assert from "node:assert/strict";
import test from "node:test";

import { validateRedirectConfig } from "../src/lib/redirects/config-validation";

test("accepts a schema-compatible redirect configuration", () => {
  assert.deepEqual(validateRedirectConfig({
    Slots: {
      Main: {
        "/docs": {
          type: "exact",
          target: "https://example.com/guide",
          status: "307",
        },
      },
    },
  }), { status: "valid" });
});

test("rejects response status strings outside the Response range", () => {
  const result = validateRedirectConfig({
    Slots: {
      Main: {
        "/docs": {
          type: "exact",
          target: "https://example.com/guide",
          status: "100",
        },
      },
    },
  });

  assert.equal(result.status, "invalid");
});

test("rejects route objects without a destination", () => {
  const result = validateRedirectConfig({
    Slots: {
      Main: {
        "/docs": {
          type: "prefix",
        },
      },
    },
  });

  assert.equal(result.status, "invalid");
});
