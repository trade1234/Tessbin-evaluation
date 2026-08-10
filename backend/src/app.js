import cors from "cors";
import express from "express";
import { connectToDatabase } from "./config/db.js";
import adminRoutes from "./routes/adminRoutes.js";
import publicRoutes from "./routes/publicRoutes.js";

const app = express();
app.set("trust proxy", 1);
function normalizeOrigin(value) {
  const origin = value?.trim();
  if (!origin) return "";
  return origin.startsWith("http://") || origin.startsWith("https://")
    ? origin.replace(/\/$/, "")
    : `https://${origin.replace(/\/$/, "")}`;
}

const allowedOrigins = new Set(
  [
    process.env.CLIENT_URL,
    ...(process.env.CLIENT_URLS || "").split(",").map((origin) => origin.trim()),
    process.env.VERCEL_URL,
    process.env.VERCEL_BRANCH_URL,
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000"
  ].map(normalizeOrigin).filter(Boolean)
);

function isAllowedOrigin(origin) {
  if (!origin) {
    return true;
  }

  return allowedOrigins.has(normalizeOrigin(origin));
}

app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        callback(null, origin || true);
        return;
      }

      callback(new Error("CORS origin not allowed."));
    },
    credentials: false
  })
);
app.use(express.json({ limit: "1mb" }));

app.get("/", (_req, res) => {
  res.send("Backend is running.");
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/public", publicRoutes);
app.use("/api/admin", adminRoutes);

app.use("/api", (_req, res) => {
  res.status(404).json({ message: "API endpoint not found." });
});

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

  if (err?.name === "ValidationError" || err instanceof SyntaxError) {
    return res.status(400).json({ message: "The request contains invalid data." });
  }

  res.status(500).json({ message: "Internal server error." });
});

export async function initializeApp() {
  await connectToDatabase();
  return app;
}

export default app;
