import mongoose from "mongoose";
import { overallOptions, ratingLabels, sourceOptions } from "../data/questions.js";

const referralSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: "" },
    phoneNumber: { type: String, trim: true, default: "" },
    address: { type: String, trim: true, default: "" },
    emailAddress: { type: String, trim: true, default: "" }
  },
  { _id: false }
);

const ratingsSchema = new mongoose.Schema(
  {
    objectiveOfTraining: { type: String, enum: ratingLabels, required: true },
    practicalToNeeds: { type: String, enum: ratingLabels, required: true },
    wellOrganized: { type: String, enum: ratingLabels, required: true },
    visualAids: { type: String, enum: ratingLabels, required: true },
    instructorKnowledge: { type: String, enum: ratingLabels, required: true },
    presentationStyle: { type: String, enum: ratingLabels, required: true },
    coveredClearly: { type: String, enum: ratingLabels, required: true },
    respondedToQuestions: { type: String, enum: ratingLabels, required: true },
    theoryToPractice: { type: String, enum: ratingLabels, required: true },
    roomPreparation: { type: String, enum: ratingLabels, required: true },
    location: { type: String, enum: ratingLabels, required: true },
    duration: { type: String, enum: ratingLabels, required: true }
  },
  { _id: false }
);

const evaluationSchema = new mongoose.Schema(
  {
    courseId: { type: String, required: true, trim: true },
    courseName: { type: String, required: true, trim: true },
    batchId: { type: String, trim: true, default: "" },
    batchName: { type: String, trim: true, default: "" },
    sessionType: { type: String, trim: true, default: "" },
    sessionLabel: { type: String, trim: true, default: "" },
    trainingDate: { type: Date, required: true },
    ratings: { type: ratingsSchema, required: true },
    participationFactors: { type: String, trim: true, default: "" },
    improvementSuggestions: { type: String, trim: true, default: "" },
    followUpTrainings: { type: String, trim: true, default: "" },
    referrals: {
      type: [referralSchema],
      default: () => Array.from({ length: 6 }, () => ({}))
    },
    heardFrom: { type: String, enum: sourceOptions, required: true },
    heardFromOther: { type: String, trim: true, default: "" },
    overallRating: { type: String, enum: overallOptions, required: true }
  },
  { timestamps: true }
);

export const Evaluation = mongoose.model("Evaluation", evaluationSchema);
