import { Router } from "express";
import crypto from "node:crypto";
import { rateLimit } from "express-rate-limit";
import jwt from "jsonwebtoken";
import { getCourseDefinition, getTrainingCatalog } from "../data/catalogService.js";
import { overallOptions, ratingValueMap, sections } from "../../../shared/formDefinition.js";
import { requireAdminAuth } from "../middleware/auth.js";
import { Batch } from "../models/Batch.js";
import { Evaluation } from "../models/Evaluation.js";
import { buildEvaluationFilters, toCsvValue } from "../utils/validation.js";

const router = Router();
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Too many login attempts. Please try again later." }
});

function getFilters(req, res) {
  const result = buildEvaluationFilters(req.query);
  if (result.error) {
    res.status(400).json({ message: result.error });
    return null;
  }
  return result.filters;
}

function secureEqual(value, expected) {
  if (typeof value !== "string" || typeof expected !== "string") {
    return false;
  }
  const valueDigest = crypto.createHash("sha256").update(value).digest();
  const expectedDigest = crypto.createHash("sha256").update(expected).digest();
  return crypto.timingSafeEqual(valueDigest, expectedDigest);
}

router.post("/login", loginLimiter, (req, res) => {
  const { username, password } = req.body;

  if (!process.env.JWT_SECRET || !process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD) {
    return res.status(503).json({ message: "Admin authentication is not configured." });
  }

  if (!secureEqual(username, process.env.ADMIN_USERNAME) || !secureEqual(password, process.env.ADMIN_PASSWORD)) {
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
  const filters = getFilters(req, res);
  if (!filters) return;
  const evaluations = await Evaluation.find(filters).sort({ createdAt: -1 }).lean();
  res.json({ evaluations });
});

router.get("/summary", async (req, res) => {
  const filters = getFilters(req, res);
  if (!filters) return;
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
    if (Object.hasOwn(overallCounts, evaluation.overallRating)) {
      overallCounts[evaluation.overallRating] += 1;
    }
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
  const filters = getFilters(req, res);
  if (!filters) return;
  const evaluations = await Evaluation.find(filters).sort({ createdAt: -1 }).lean();
  const headers = [
    "Submitted At",
    "Course",
    "Batch",
    "Session Type",
    "Session Label",
    "Instructor",
    "Training Date",
    "Trainee Email",
    "Trainee Phone Number",
    "Content: Was the training objective clear and easy to understand?",
    "Content: Was the training useful for your work?",
    "Content: Was the training well organized?",
    "Content: Were the training materials (slides, handouts, visuals) helpful?",
    "Trainer: Was the training objective clear and easy to understand?",
    "Trainer: Was the training useful for your work?",
    "Trainer: Was the training well organized?",
    "Trainer: Were the training materials (slides, handouts, visuals) helpful?",
    "Improvement Suggestions",
    "Heard From",
    "Heard From Other",
    "Overall Rating",
    "Referrals"
  ];

  const rows = evaluations.map((item) => [
    item.createdAt,
    item.courseName,
    item.batchName,
    item.sessionType,
    item.sessionLabel,
    item.instructorName,
    item.trainingDate?.toISOString?.().slice(0, 10) || "",
    item.traineeEmail,
    item.traineePhoneNumber,
    item.ratings?.objectiveOfTraining,
    item.ratings?.practicalToNeeds,
    item.ratings?.wellOrganized,
    item.ratings?.visualAids,
    item.ratings?.trainerObjectiveClear,
    item.ratings?.trainerUsefulForWork,
    item.ratings?.trainerWellOrganized,
    item.ratings?.trainerMaterialsHelpful,
    item.improvementSuggestions,
    item.heardFrom,
    item.heardFromOther,
    item.overallRating,
    (item.referrals || [])
      .filter((referral) => referral.name || referral.phoneNumber || referral.address || referral.emailAddress)
      .map((referral) => [referral.name, referral.phoneNumber, referral.emailAddress, referral.address].filter(Boolean).join(" | "))
      .join("; ")
  ]);

  const csv = `\uFEFF${[headers, ...rows].map((row) => row.map(toCsvValue).join(",")).join("\r\n")}`;

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="evaluations.csv"');
  res.send(csv);
});

export default router;
