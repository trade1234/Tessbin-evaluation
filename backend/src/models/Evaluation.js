import mongoose from "mongoose";
import { overallOptions, ratingLabels, sourceOptions } from "../../../shared/formDefinition.js";

const legacyRatingLabels = [...ratingLabels, "Very good", "Needs improvement", "Not applicable"];

const referralSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, maxlength: 120, default: "" },
    phoneNumber: { type: String, trim: true, maxlength: 40, default: "" },
    address: { type: String, trim: true, maxlength: 300, default: "" },
    emailAddress: { type: String, trim: true, lowercase: true, maxlength: 254, default: "" }
  },
  { _id: false }
);

const ratingsSchema = new mongoose.Schema(
  {
    objectiveOfTraining: { type: String, enum: legacyRatingLabels, required: true },
    practicalToNeeds: { type: String, enum: legacyRatingLabels, required: true },
    wellOrganized: { type: String, enum: legacyRatingLabels, required: true },
    visualAids: { type: String, enum: legacyRatingLabels, required: true },
    trainerObjectiveClear: { type: String, enum: ratingLabels, required: true },
    trainerUsefulForWork: { type: String, enum: ratingLabels, required: true },
    trainerWellOrganized: { type: String, enum: ratingLabels, required: true },
    trainerMaterialsHelpful: { type: String, enum: ratingLabels, required: true },
    instructorKnowledge: { type: String, enum: legacyRatingLabels },
    presentationStyle: { type: String, enum: legacyRatingLabels },
    coveredClearly: { type: String, enum: legacyRatingLabels },
    respondedToQuestions: { type: String, enum: legacyRatingLabels },
    theoryToPractice: { type: String, enum: legacyRatingLabels },
    roomPreparation: { type: String, enum: legacyRatingLabels },
    location: { type: String, enum: legacyRatingLabels },
    duration: { type: String, enum: legacyRatingLabels }
  },
  { _id: false }
);

const evaluationSchema = new mongoose.Schema(
  {
    courseId: { type: String, required: true, trim: true },
    courseName: { type: String, required: true, trim: true },
    traineeEmail: { type: String, trim: true, lowercase: true, maxlength: 254, default: "" },
    traineePhoneNumber: { type: String, trim: true, maxlength: 40, default: "" },
    batchId: { type: String, trim: true, default: "" },
    batchName: { type: String, trim: true, default: "" },
    sessionType: { type: String, trim: true, default: "" },
    sessionLabel: { type: String, trim: true, default: "" },
    instructorName: { type: String, trim: true, maxlength: 120, default: "" },
    trainingDate: { type: Date, required: true },
    ratings: { type: ratingsSchema, required: true },
    participationFactors: { type: String, trim: true, maxlength: 2000, default: "" },
    improvementSuggestions: { type: String, trim: true, maxlength: 2000, default: "" },
    followUpTrainings: { type: String, trim: true, maxlength: 2000, default: "" },
    referrals: {
      type: [referralSchema],
      default: () => Array.from({ length: 6 }, () => ({}))
    },
    heardFrom: { type: String, enum: sourceOptions, required: true },
    heardFromOther: { type: String, trim: true, maxlength: 300, default: "" },
    overallRating: { type: String, enum: overallOptions, required: true }
  },
  { timestamps: true }
);

export const Evaluation = mongoose.model("Evaluation", evaluationSchema);
