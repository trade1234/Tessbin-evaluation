import { Router } from "express";
import mongoose from "mongoose";
import { getCourseDefinition, getTrainingCatalog } from "../data/catalogService.js";
import { defaultBatches } from "../data/catalog.js";
import { overallOptions, ratingLabels, sections, sourceOptions } from "../data/formDefinition.js";
import { Evaluation } from "../models/Evaluation.js";
import { Batch } from "../models/Batch.js";
import { sendEvaluationSubmittedEmail } from "../services/emailService.js";
import { validateEvaluationPayload } from "../utils/validation.js";

const router = Router();
const databaseOperationTimeoutMs = 5000;

router.get("/metadata", async (_req, res) => {
  const catalog = await getTrainingCatalog();

  res.json({
    catalog,
    formDefinition: {
      ratingLabels,
      overallOptions,
      sourceOptions,
      sections
    }
  });
});

router.post("/evaluations", async (req, res) => {
  const { error, value: payload } = validateEvaluationPayload(req.body);

  if (error) {
    return res.status(400).json({ message: error });
  }

  const course = getCourseDefinition(payload.courseId);

  if (!course) {
    return res.status(400).json({ message: "Invalid course selection." });
  }

  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      message: "The evaluation service is temporarily unavailable. Please try again shortly."
    });
  }

  let batch = null;
  try {
    batch = await Batch.findOne({ batchId: payload.batchId, courseId: payload.courseId })
      .maxTimeMS(databaseOperationTimeoutMs)
      .lean();
  } catch (dbErr) {
    console.error("Failed to find evaluation batch:", dbErr.message);
    return res.status(503).json({
      message: "The evaluation service is temporarily unavailable. Please try again shortly."
    });
  }

  if (!batch) {
    const defaultMatch = defaultBatches.find((b) => b.batchId === payload.batchId && b.courseId === payload.courseId);
    if (defaultMatch) {
      batch = {
        ...defaultMatch,
        trainingDate: new Date(defaultMatch.trainingDate)
      };
    }
  }

  if (!batch) {
    return res.status(400).json({ message: "Invalid batch selection." });
  }

  if (batch.evaluationOpen === false) {
    return res.status(400).json({ message: "This evaluation session is currently closed." });
  }

  let evaluation = null;
  try {
    evaluation = new Evaluation({
      ...payload,
      courseName: course.courseName,
      batchId: batch.batchId,
      batchName: batch.batchName,
      sessionType: batch.sessionType || "Regular",
      sessionLabel: batch.sessionLabel || batch.batchName,
      instructorName: batch.instructorName || "",
      trainingDate: batch.trainingDate
    });
    await evaluation.save({ timeoutMS: databaseOperationTimeoutMs });
  } catch (createErr) {
    console.error("Failed to save evaluation:", createErr.message);
    return res.status(503).json({
      message: "Your evaluation could not be saved. Please try again shortly."
    });
  }

  // Confirm the database save before starting SMTP work. This guarantees that
  // a slow or unavailable mail server can never delay the trainee's response.
  res.status(201).json({
    id: evaluation._id,
    message: "Evaluation submitted successfully.",
    emailScheduled: true
  });

  const emailPromise = sendEvaluationSubmittedEmail(evaluation).catch((error) => {
    console.error("Failed to send evaluation notification email:", error?.message || error);
    return { delivered: false, reason: "send_failed" };
  });

  if (typeof req.vercelWaitUntil === "function") {
    req.vercelWaitUntil(emailPromise);
  }

  return undefined;
});

export default router;
