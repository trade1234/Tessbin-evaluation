import mongoose from "mongoose";

const batchSchema = new mongoose.Schema(
  {
    batchId: { type: String, required: true, trim: true, unique: true },
    courseId: { type: String, required: true, trim: true, index: true },
    batchName: { type: String, required: true, trim: true },
    trainingDate: { type: Date, required: true },
    sessionType: {
      type: String,
      enum: ["Regular", "Weekend", "Night"],
      default: "Regular"
    },
    sessionLabel: { type: String, trim: true, default: "" },
    evaluationOpen: { type: Boolean, default: true }
  },
  { timestamps: true }
);

batchSchema.index({ courseId: 1, batchName: 1 }, { unique: true });

export const Batch = mongoose.model("Batch", batchSchema);
