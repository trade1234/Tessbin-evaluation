import { defaultBatches, trainingCourses } from "./catalog.js";
import { Batch } from "../models/Batch.js";

function sortBatchesByDate(left, right) {
  return new Date(left.trainingDate) - new Date(right.trainingDate);
}

export async function seedDefaultBatches() {
  const existingCount = await Batch.countDocuments();

  if (existingCount > 0) {
    return;
  }

  await Batch.insertMany(
    defaultBatches.map((batch) => ({
      ...batch,
      trainingDate: new Date(batch.trainingDate)
    }))
  );
}

export async function getTrainingCatalog() {
  const batches = await Batch.find({}).sort({ trainingDate: 1, batchName: 1 }).lean();
  const batchMap = batches.reduce((accumulator, batch) => {
    const courseBatches = accumulator[batch.courseId] || [];
    courseBatches.push({
      batchId: batch.batchId,
      batchName: batch.batchName,
      trainingDate: batch.trainingDate,
      sessionType: batch.sessionType || "Regular",
      sessionLabel: batch.sessionLabel || `${batch.batchName} - ${new Date(batch.trainingDate).toLocaleDateString("en-US")}`,
      evaluationOpen: batch.evaluationOpen !== false
    });
    accumulator[batch.courseId] = courseBatches;
    return accumulator;
  }, {});

  return trainingCourses.map((course) => ({
    ...course,
    batches: (batchMap[course.courseId] || []).sort(sortBatchesByDate)
  }));
}

export function getCourseDefinition(courseId) {
  return trainingCourses.find((item) => item.courseId === courseId);
}
