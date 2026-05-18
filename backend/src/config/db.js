import mongoose from "mongoose";
import { seedDefaultBatches } from "../data/catalogService.js";

let connectionPromise;

export async function connectToDatabase() {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error("MONGODB_URI is not configured.");
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!connectionPromise) {
    connectionPromise = mongoose
      .connect(mongoUri)
      .then(async () => {
        await seedDefaultBatches();
        console.log(`MongoDB connected: ${mongoose.connection.name}`);
        return mongoose.connection;
      })
      .catch((error) => {
        connectionPromise = undefined;
        throw error;
      });
  }

  return connectionPromise;
}
