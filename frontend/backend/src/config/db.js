import mongoose from "mongoose";
import { seedDefaultBatches } from "../data/catalogService.js";

let connectionPromise;

mongoose.set("bufferCommands", false);

export async function connectToDatabase() {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    console.warn("MONGODB_URI environment variable is missing.");
    return null;
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!connectionPromise) {
    connectionPromise = mongoose
      .connect(mongoUri, {
        serverSelectionTimeoutMS: 4000,
        connectTimeoutMS: 4000
      })
      .then(() => {
        console.log(`MongoDB connected: ${mongoose.connection.name}`);
        seedDefaultBatches().catch((err) => console.error("Seeding error:", err));
        return mongoose.connection;
      })
      .catch((error) => {
        connectionPromise = undefined;
        throw error;
      });
  }

  return connectionPromise;
}
