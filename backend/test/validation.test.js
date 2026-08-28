import assert from "node:assert/strict";
import test from "node:test";
import { sections } from "../../shared/formDefinition.js";
import { buildEvaluationFilters, toCsvValue, validateEvaluationPayload } from "../src/utils/validation.js";

function validPayload() {
  return {
    courseId: "digital-marketing",
    batchId: "dm-batch-041",
    traineeEmail: " Trainee@Example.com ",
    traineePhoneNumber: "+251900000000",
    ratings: Object.fromEntries(
      sections.flatMap((section) => section.questions.map((question) => [question.key, "Excellent"]))
    ),
    improvementSuggestions: "",
    referrals: [{ name: "Friend", emailAddress: " FRIEND@example.com " }],
    heardFrom: "Other",
    heardFromOther: "Website",
    overallRating: "Excellent"
  };
}

test("evaluation validation returns a normalized allow-listed payload", () => {
  const payload = validPayload();
  payload.unexpected = "must not be persisted";
  const result = validateEvaluationPayload(payload);

  assert.equal(result.error, undefined);
  assert.equal(result.value.traineeEmail, "trainee@example.com");
  assert.equal(result.value.referrals[0].emailAddress, "friend@example.com");
  assert.equal(Object.hasOwn(result.value, "unexpected"), false);
  assert.equal(Object.hasOwn(result.value, "participationFactors"), false);
  assert.equal(Object.hasOwn(result.value, "followUpTrainings"), false);
});

test("the active questionnaire has only the trainer rating section", () => {
  assert.deepEqual(sections.map((section) => section.key), ["presentation"]);
  assert.equal(sections[0].questions.length, 4);
  assert.equal(sections[0].questions[1].label, "Was the training useful for your work?");
});

test("evaluation validation requires every rating", () => {
  const payload = validPayload();
  delete payload.ratings.trainerMaterialsHelpful;
  assert.match(validateEvaluationPayload(payload).error, /Every rating question/);
});

test("email, comments, and referrals may be left blank", () => {
  const payload = validPayload();
  payload.traineeEmail = "";
  payload.improvementSuggestions = "";
  payload.referrals = [{}];

  const result = validateEvaluationPayload(payload);
  assert.equal(result.error, undefined);
  assert.equal(result.value.traineeEmail, "");
  assert.equal(result.value.improvementSuggestions, "");
  assert.deepEqual(result.value.referrals, []);
});

test("an optional email must still be valid when provided", () => {
  const payload = validPayload();
  payload.traineeEmail = "not-an-email";
  assert.match(validateEvaluationPayload(payload).error, /valid email address/);
});

test("evaluation validation enforces Other details and referral limits", () => {
  const missingOther = validPayload();
  missingOther.heardFromOther = "";
  assert.match(validateEvaluationPayload(missingOther).error, /specify/);

  const tooManyReferrals = validPayload();
  tooManyReferrals.referrals = Array.from({ length: 7 }, () => ({}));
  assert.match(validateEvaluationPayload(tooManyReferrals).error, /six referrals/);
});

test("date filters include the complete final day and reject reversed ranges", () => {
  const result = buildEvaluationFilters({ dateFrom: "2026-05-01", dateTo: "2026-05-31" });
  assert.equal(result.filters.trainingDate.$gte.toISOString(), "2026-05-01T00:00:00.000Z");
  assert.equal(result.filters.trainingDate.$lte.toISOString(), "2026-05-31T23:59:59.999Z");
  const submittedResult = buildEvaluationFilters({
    dateFrom: "2026-08-01",
    dateTo: "2026-08-31",
    dateField: "submitted"
  });
  assert.equal(submittedResult.filters.createdAt.$gte.toISOString(), "2026-08-01T00:00:00.000Z");
  assert.equal(submittedResult.filters.createdAt.$lte.toISOString(), "2026-08-31T23:59:59.999Z");
  assert.match(buildEvaluationFilters({ dateFrom: "2026-06-01", dateTo: "2026-05-01" }).error, /cannot be after/);
  assert.match(buildEvaluationFilters({ dateFrom: "2026-02-31" }).error, /Invalid date/);
  assert.match(buildEvaluationFilters({ dateField: "unknown" }).error, /Invalid date field/);
});

test("CSV values escape quotes and neutralize spreadsheet formulas", () => {
  assert.equal(toCsvValue('A "quoted" value'), '"A ""quoted"" value"');
  assert.equal(toCsvValue("=2+2"), '"\'=2+2"');
});
