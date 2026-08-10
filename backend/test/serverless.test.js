import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import app from "../src/app.js";
import { sections } from "../src/data/formDefinition.js";

function validEvaluation() {
  return {
    courseId: "international-import-export",
    batchId: "iie-batch-127",
    traineeEmail: "",
    traineePhoneNumber: "",
    ratings: Object.fromEntries(
      sections.flatMap((section) => section.questions.map((question) => [question.key, "Excellent"]))
    ),
    improvementSuggestions: "",
    referrals: [],
    heardFrom: "Other",
    heardFromOther: "Test",
    overallRating: "Excellent"
  };
}

test("submission fails quickly when the serverless database connection is unavailable", async () => {
  await mongoose.disconnect();

  const server = app.listen(0);
  try {
    const { port } = server.address();
    const startedAt = Date.now();
    const response = await fetch(`http://127.0.0.1:${port}/api/public/evaluations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validEvaluation())
    });
    const result = await response.json();

    assert.equal(response.status, 503);
    assert.match(result.message, /temporarily unavailable/i);
    assert.ok(Date.now() - startedAt < 2000, "database failure should not wait for Mongoose buffering");
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
});
