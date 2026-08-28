import mongoose from "mongoose";
import { seedDefaultBatches } from "../data/catalogService.js";

let connectionPromise;

// A serverless request must never sit in Mongoose's default operation queue
// after a cold-start connection has already failed.
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
        connectTimeoutMS: 4000,
        socketTimeoutMS: 5000,
        waitQueueTimeoutMS: 5000,
        maxPoolSize: 5,
        family: 4
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
