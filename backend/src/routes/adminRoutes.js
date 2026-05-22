import { Router } from "express";
import jwt from "jsonwebtoken";
import { getCourseDefinition, getTrainingCatalog } from "../data/catalogService.js";
import { overallOptions, ratingValueMap, sections } from "../data/questions.js";
import { requireAdminAuth } from "../middleware/auth.js";
import { Batch } from "../models/Batch.js";
import { Evaluation } from "../models/Evaluation.js";

const router = Router();

function buildFilters(query) {
  const filters = {};

  if (query.courseId) {
    filters.courseId = query.courseId;
  }

  if (query.batchId) {
    filters.batchId = query.batchId;
  }

  if (query.dateFrom || query.dateTo) {
    filters.trainingDate = {};
    if (query.dateFrom) {
      filters.trainingDate.$gte = new Date(query.dateFrom);
    }
    if (query.dateTo) {
      filters.trainingDate.$lte = new Date(query.dateTo);
    }
  }

  return filters;
}

function toCsvValue(value) {
  const stringValue = value == null ? "" : String(value);
  return `"${stringValue.replaceAll('"', '""')}"`;
}

router.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ message: "JWT_SECRET is not configured." });
  }

  if (username !== process.env.ADMIN_USERNAME || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ message: "Invalid admin credentials." });
  }

  const token = jwt.sign({ username, role: "admin" }, process.env.JWT_SECRET, {
    expiresIn: "8h"
  });

  return res.json({ token });
});

router.use(requireAdminAuth);

router.get("/catalog", async (_req, res) => {
  const catalog = await getTrainingCatalog();
  res.json({ catalog, overallOptions, sections });
});

router.get("/batches", async (_req, res) => {
  const batches = await Batch.find({}).sort({ trainingDate: 1, courseId: 1, batchName: 1 }).lean();
  res.json({ batches });
});

router.post("/batches", async (req, res) => {
  const { courseId, batchName, trainingDate, sessionType, sessionLabel, evaluationOpen, instructorName } = req.body;
  const course = getCourseDefinition(courseId);

  if (!course) {
    return res.status(400).json({ message: "Invalid course selection." });
  }

  if (!batchName?.trim() || !trainingDate) {
    return res.status(400).json({ message: "Batch name and training date are required." });
  }

  const normalizedName = batchName.trim();
  const dateValue = new Date(trainingDate);

  if (Number.isNaN(dateValue.getTime())) {
    return res.status(400).json({ message: "Invalid training date." });
  }

  const existingBatch = await Batch.findOne({
    courseId,
    batchName: normalizedName
  }).lean();

  if (existingBatch) {
    return res.status(400).json({ message: "A batch with this name already exists for the selected course." });
  }

  const slug = normalizedName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const batchId = `${courseId}-${slug}-${dateValue.toISOString().slice(0, 10)}`;

  const created = await Batch.create({
    batchId,
    courseId,
    batchName: normalizedName,
    trainingDate: dateValue,
    sessionType: sessionType || "Regular",
    sessionLabel: sessionLabel?.trim() || `${sessionType || "Regular"} - ${dateValue.toLocaleDateString("en-US")}`,
    evaluationOpen: evaluationOpen !== false,
    instructorName: instructorName?.trim() || ""
  });

  res.status(201).json({ batch: created });
});

router.put("/batches/:id", async (req, res) => {
  const { courseId, batchName, trainingDate, sessionType, sessionLabel, evaluationOpen, instructorName } = req.body;
  const course = getCourseDefinition(courseId);

  if (!course) {
    return res.status(400).json({ message: "Invalid course selection." });
  }

  if (!batchName?.trim() || !trainingDate) {
    return res.status(400).json({ message: "Batch name and training date are required." });
  }

  const dateValue = new Date(trainingDate);

  if (Number.isNaN(dateValue.getTime())) {
    return res.status(400).json({ message: "Invalid training date." });
  }

  const duplicateBatch = await Batch.findOne({
    _id: { $ne: req.params.id },
    courseId,
    batchName: batchName.trim()
  }).lean();

  if (duplicateBatch) {
    return res.status(400).json({ message: "A batch with this name already exists for the selected course." });
  }

  const updated = await Batch.findByIdAndUpdate(
    req.params.id,
    {
      courseId,
      batchName: batchName.trim(),
      trainingDate: dateValue,
      sessionType: sessionType || "Regular",
      sessionLabel: sessionLabel?.trim() || `${sessionType || "Regular"} - ${dateValue.toLocaleDateString("en-US")}`,
      evaluationOpen: evaluationOpen !== false,
      instructorName: instructorName?.trim() || ""
    },
    { new: true, runValidators: true }
  );

  if (!updated) {
    return res.status(404).json({ message: "Batch not found." });
  }

  res.json({ batch: updated });
});

router.delete("/batches/:id", async (req, res) => {
  const batch = await Batch.findById(req.params.id).lean();

  if (!batch) {
    return res.status(404).json({ message: "Batch not found." });
  }

  const evaluationCount = await Evaluation.countDocuments({ batchId: batch.batchId });

  if (evaluationCount > 0) {
    return res.status(400).json({ message: "This batch already has evaluations and cannot be deleted." });
  }

  await Batch.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

router.get("/evaluations", async (req, res) => {
  const filters = buildFilters(req.query);
  const evaluations = await Evaluation.find(filters).sort({ createdAt: -1 }).lean();
  res.json({ evaluations });
});

router.get("/summary", async (req, res) => {
  const filters = buildFilters(req.query);
  const evaluations = await Evaluation.find(filters).lean();
  const ratingKeys = sections.flatMap((section) => section.questions.map((question) => question.key));
  const ratingTotals = {};
  const ratingCounts = {};
  const overallCounts = Object.fromEntries(overallOptions.map((item) => [item, 0]));

  for (const key of ratingKeys) {
    ratingTotals[key] = 0;
    ratingCounts[key] = 0;
  }

  for (const evaluation of evaluations) {
    for (const key of ratingKeys) {
      const value = ratingValueMap[evaluation.ratings[key]];
      if (value > 0) {
        ratingTotals[key] += value;
        ratingCounts[key] += 1;
      }
    }
    overallCounts[evaluation.overallRating] += 1;
  }

  const questionAverages = sections.flatMap((section) =>
    section.questions.map((question) => ({
      key: question.key,
      label: question.label,
      section: section.title,
      average:
        ratingCounts[question.key] > 0
          ? Number((ratingTotals[question.key] / ratingCounts[question.key]).toFixed(2))
          : null
    }))
  );

  res.json({
    totalSubmissions: evaluations.length,
    overallCounts,
    questionAverages
  });
});

router.get("/export", async (req, res) => {
  const filters = buildFilters(req.query);
  const evaluations = await Evaluation.find(filters).sort({ createdAt: -1 }).lean();
  const headers = [
    "Submitted At",
    "Course",
    "Batch",
    "Training Date",
    "Objective of the training",
    "Practice to my needs and interest",
    "Well organized",
    "Useful visual aids and handouts",
    "Instructor's knowledge",
    "Instructor's presentation style",
    "Instructor covered the material clearly",
    "Instructor responded well to questions",
    "Instructor's ability to relate theory to practice",
    "Training room preparation",
    "Location of the training",
    "Duration of the training",
    "Participation Factors",
    "Improvement Suggestions",
    "Follow-up Trainings",
    "Heard From",
    "Heard From Other",
    "Overall Rating"
  ];

  const rows = evaluations.map((item) => [
    item.createdAt,
    item.courseName,
    item.batchName,
    item.trainingDate?.toISOString?.().slice(0, 10) || "",
    item.ratings.objectiveOfTraining,
    item.ratings.practicalToNeeds,
    item.ratings.wellOrganized,
    item.ratings.visualAids,
    item.ratings.instructorKnowledge,
    item.ratings.presentationStyle,
    item.ratings.coveredClearly,
    item.ratings.respondedToQuestions,
    item.ratings.theoryToPractice,
    item.ratings.roomPreparation,
    item.ratings.location,
    item.ratings.duration,
    item.participationFactors,
    item.improvementSuggestions,
    item.followUpTrainings,
    item.heardFrom,
    item.heardFromOther,
    item.overallRating
  ]);

  const csv = [headers, ...rows].map((row) => row.map(toCsvValue).join(",")).join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", 'attachment; filename="evaluations.csv"');
  res.send(csv);
});

export default router;
