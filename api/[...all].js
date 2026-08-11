import app from "../backend/src/app.js";
import { connectToDatabase } from "../backend/src/config/db.js";
import { waitUntil } from "@vercel/functions";

export default async function handler(req, res) {
  // Expose Vercel's request-lifecycle helper to the Express routes. Long-running
  // side effects (such as SMTP) can then finish without delaying the response.
  req.vercelWaitUntil = waitUntil;

  try {
    await connectToDatabase();
  } catch (err) {
    console.error("Vercel DB Connection Error:", err?.message || err);
  }

  if (req.url && (req.url.includes("[...all]") || req.url.includes("[all]"))) {
    try {
      const parsed = new URL(req.url, "http://localhost");
      const paramVal = parsed.searchParams.get("0") || parsed.searchParams.get("all") || parsed.searchParams.get("match");
      if (paramVal) {
        req.url = paramVal.startsWith("/") ? paramVal : `/${paramVal}`;
      }
    } catch {}
  }

  return app(req, res);
}
