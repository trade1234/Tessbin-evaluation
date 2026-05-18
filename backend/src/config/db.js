import mongoose from "mongoose";
import { seedDefaultBatches } from "../data/catalogService.js";

export async function connectToDatabase() {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error("MONGODB_URI is not configured.");
  }

  await mongoose.connect(mongoUri);
  await seedDefaultBatches();
  console.log(`MongoDB connected: ${mongoose.connection.name}`);
}
