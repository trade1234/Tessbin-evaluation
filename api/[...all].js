import app, { initializeApp } from "../backend/src/app.js";

let initialized = false;

export default async function handler(req, res) {
  try {
    if (!initialized) {
      await initializeApp();
      initialized = true;
    }
  } catch (err) {
    console.error("Vercel DB Init Warning:", err?.message || err);
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
