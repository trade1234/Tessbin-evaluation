// Friendly root route
app.get("/", (_req, res) => {
  res.send("Backend is running.");
});
import "dotenv/config";
import cors from "cors";
import express from "express";
import { connectToDatabase } from "./config/db.js";
import adminRoutes from "./routes/adminRoutes.js";
import publicRoutes from "./routes/publicRoutes.js";

const app = express();
const port = process.env.PORT || 5000;

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173"
  })
);
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/public", publicRoutes);
app.use("/api/admin", adminRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);

  if (err?.code === 11000) {
    const duplicateField = Object.keys(err.keyPattern || {})[0];
    const fieldLabels = {
      batchId: "batch identifier",
      courseId: "course",
      batchName: "batch name"
    };
    const fieldLabel = fieldLabels[duplicateField] || "value";
    return res.status(400).json({ message: `A batch with this ${fieldLabel} already exists.` });
  }

  if (err?.name === "CastError") {
    return res.status(400).json({ message: "Invalid record identifier." });
  }

  res.status(500).json({ message: err.message || "Internal server error." });
});

connectToDatabase()
  .then(() => {
    app.listen(port, () => {
      console.log(`Server listening on port ${port}`);
    });
  })
  .catch((error) => {
    console.error("Database connection failed:", error.message);
    process.exit(1);
  });
