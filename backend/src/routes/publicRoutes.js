import { Router } from "express";
import { getCourseDefinition, getTrainingCatalog } from "../data/catalogService.js";
import { overallOptions, ratingLabels, sections, sourceOptions } from "../data/questions.js";
import { Evaluation } from "../models/Evaluation.js";
import { Batch } from "../models/Batch.js";

const router = Router();

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
  const course = getCourseDefinition(payload.courseId);

  if (!course) {
    return res.status(400).json({ message: "Invalid course selection." });
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
    courseName: course.courseName,
    batchId: batch.batchId,
    batchName: batch.batchName,
    sessionType: batch.sessionType || "Regular",
    sessionLabel: batch.sessionLabel || batch.batchName,
    trainingDate: batch.trainingDate
  });

  return res.status(201).json({
    id: evaluation._id,
    message: "Evaluation submitted successfully."
  });
});

export default router;
