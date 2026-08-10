import { overallOptions, ratingLabels, sections, sourceOptions } from "../data/formDefinition.js";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const ratingKeys = sections.flatMap((section) => section.questions.map((question) => question.key));

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isTooLong(value, maximum) {
  return cleanString(value).length > maximum;
}

export function validateEvaluationPayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { error: "A valid evaluation payload is required." };
  }

  const traineeEmail = cleanString(payload.traineeEmail).toLowerCase();
  if (traineeEmail && (!emailPattern.test(traineeEmail) || traineeEmail.length > 254)) {
    return { error: "Please enter a valid email address or leave it blank." };
  }

  if (!cleanString(payload.courseId) || !cleanString(payload.batchId)) {
    return { error: "Course and session selections are required." };
  }

  const ratings = {};
  for (const key of ratingKeys) {
    const value = payload.ratings?.[key];
    if (!ratingLabels.includes(value)) {
      return { error: "Every rating question must have a valid response." };
    }
    ratings[key] = value;
  }

  if (!sourceOptions.includes(payload.heardFrom)) {
    return { error: "Please select how you heard about the training." };
  }

  const heardFromOther = cleanString(payload.heardFromOther);
  if (payload.heardFrom === "Other" && !heardFromOther) {
    return { error: "Please specify how you heard about the training." };
  }

  if (!overallOptions.includes(payload.overallRating)) {
    return { error: "Please select a valid overall rating." };
  }

  const referrals = payload.referrals == null ? [] : payload.referrals;
  if (!Array.isArray(referrals) || referrals.length > 6) {
    return { error: "Up to six referrals may be submitted." };
  }

  const normalizedReferrals = [];
  for (const referral of referrals) {
    if (!referral || typeof referral !== "object" || Array.isArray(referral)) {
      return { error: "Each referral must be a valid record." };
    }

    const emailAddress = cleanString(referral.emailAddress).toLowerCase();
    if (emailAddress && (!emailPattern.test(emailAddress) || emailAddress.length > 254)) {
      return { error: "Each referral email must be valid." };
    }

    if (
      isTooLong(referral.name, 120) ||
      isTooLong(referral.phoneNumber, 40) ||
      isTooLong(referral.address, 300)
    ) {
      return { error: "One or more referral fields are too long." };
    }

    const normalizedReferral = {
      name: cleanString(referral.name),
      phoneNumber: cleanString(referral.phoneNumber),
      address: cleanString(referral.address),
      emailAddress
    };

    if (Object.values(normalizedReferral).some(Boolean)) {
      normalizedReferrals.push(normalizedReferral);
    }
  }

  if (
    isTooLong(payload.traineePhoneNumber, 40) ||
    isTooLong(payload.improvementSuggestions, 2000) ||
    heardFromOther.length > 300
  ) {
    return { error: "One or more evaluation fields are too long." };
  }

  return {
    value: {
      courseId: cleanString(payload.courseId),
      batchId: cleanString(payload.batchId),
      traineeEmail,
      traineePhoneNumber: cleanString(payload.traineePhoneNumber),
      ratings,
      improvementSuggestions: cleanString(payload.improvementSuggestions),
      referrals: normalizedReferrals,
      heardFrom: payload.heardFrom,
      heardFromOther: payload.heardFrom === "Other" ? heardFromOther : "",
      overallRating: payload.overallRating
    }
  };
}

export function buildEvaluationFilters(query = {}) {
  const filters = {};
  const courseId = cleanString(query.courseId);
  const batchId = cleanString(query.batchId);
  const dateFrom = cleanString(query.dateFrom);
  const dateTo = cleanString(query.dateTo);

  if (courseId) filters.courseId = courseId;
  if (batchId) filters.batchId = batchId;

  if ((dateFrom && !datePattern.test(dateFrom)) || (dateTo && !datePattern.test(dateTo))) {
    return { error: "Dates must use YYYY-MM-DD format." };
  }

  if (dateFrom || dateTo) {
    const from = dateFrom ? new Date(`${dateFrom}T00:00:00.000Z`) : null;
    const to = dateTo ? new Date(`${dateTo}T23:59:59.999Z`) : null;

    if (
      (from && (Number.isNaN(from.getTime()) || from.toISOString().slice(0, 10) !== dateFrom)) ||
      (to && (Number.isNaN(to.getTime()) || to.toISOString().slice(0, 10) !== dateTo))
    ) {
      return { error: "Invalid date filter." };
    }
    if (from && to && from > to) {
      return { error: "The from date cannot be after the to date." };
    }

    filters.trainingDate = {};
    if (from) filters.trainingDate.$gte = from;
    if (to) filters.trainingDate.$lte = to;
  }

  return { filters };
}

export function toCsvValue(value) {
  let stringValue = value == null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(stringValue)) {
    stringValue = `'${stringValue}`;
  }
  return `"${stringValue.replaceAll('"', '""')}"`;
}
