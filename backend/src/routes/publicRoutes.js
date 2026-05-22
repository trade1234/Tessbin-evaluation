import { Router } from "express";
import { getCourseDefinition, getTrainingCatalog } from "../data/catalogService.js";
import { overallOptions, ratingLabels, sections, sourceOptions } from "../data/questions.js";
import { Evaluation } from "../models/Evaluation.js";
import { Batch } from "../models/Batch.js";
import { sendEvaluationSubmittedEmail } from "../services/emailService.js";

const router = Router();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  const payload = req.body;
  const traineeEmail = (payload.traineeEmail || "").trim().toLowerCase();
  const course = getCourseDefinition(payload.courseId);

  if (!course) {
    return res.status(400).json({ message: "Invalid course selection." });
  }

  if (!emailPattern.test(traineeEmail)) {
    return res.status(400).json({ message: "A valid email address is required." });
  }

  const batch = await Batch.findOne({ batchId: payload.batchId, courseId: payload.courseId }).lean();

  if (!batch) {
    return res.status(400).json({ message: "Invalid batch selection." });
  }

  if (batch.evaluationOpen === false) {
    return res.status(400).json({ message: "This evaluation session is currently closed." });
  }

  const evaluation = await Evaluation.create({
    ...payload,
    traineeEmail,
    courseName: course.courseName,
    batchId: batch.batchId,
    batchName: batch.batchName,
    sessionType: batch.sessionType || "Regular",
    sessionLabel: batch.sessionLabel || batch.batchName,
    trainingDate: batch.trainingDate
  });

  try {
    await sendEvaluationSubmittedEmail(evaluation);
  } catch (error) {
    console.error("Failed to send evaluation notification email:", error);
    return res.status(500).json({
      id: evaluation._id,
      message: "Evaluation was saved, but the email notification failed. Please check the SMTP mailbox credentials."
    });
  }

  return res.status(201).json({
    id: evaluation._id,
    message: "Evaluation submitted successfully."
  });
});

export default router;
