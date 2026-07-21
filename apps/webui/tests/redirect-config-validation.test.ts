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

test("rejects duplicate analytics IDs across routes", () => {
  const analyticsId = "eb5deba4-32b7-476f-b7f3-4b5c598a397c";
  const result = validateRedirectConfig({
    Slots: {
      Main: {
        "/docs": {
          analyticsId,
          target: "https://example.com/docs",
        },
        "/guide": {
          analyticsId: analyticsId.toUpperCase(),
          target: "https://example.com/guide",
        },
      },
    },
  });

  assert.equal(result.status, "invalid");
  assert.ok(
    result.status === "invalid"
    && result.issues.some((issue) => (
      issue.path === "/Slots/Main/~1guide/analyticsId"
      && issue.message.includes("/Slots/Main/~1docs/analyticsId")
    )),
  );
});

test("does not confuse a slot group containing a target entry with a route", () => {
  const analyticsId = "eb5deba4-32b7-476f-b7f3-4b5c598a397c";
  const result = validateRedirectConfig({
    Slots: {
      Main: {
        target: "https://example.com/ignored",
        "/docs": { analyticsId, target: "https://example.com/docs" },
        "/guide": { analyticsId, target: "https://example.com/guide" },
      },
    },
  });

  assert.equal(result.status, "invalid");
  assert.ok(
    result.status === "invalid"
    && result.issues.some((issue) => issue.path === "/Slots/Main/~1guide/analyticsId"),
  );
});
