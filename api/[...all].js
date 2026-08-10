import app, { initializeApp } from "../backend/src/app.js";

let initializedPromise;

export default async function handler(req, res) {
  if (!initializedPromise) {
    initializedPromise = initializeApp().catch((error) => {
      initializedPromise = undefined;
      throw error;
    });
  }

  if (req.url) {
    const rawUrl = req.url;
    if (rawUrl.includes("[...all]") || rawUrl.includes("[all]")) {
      try {
        const parsed = new URL(rawUrl, "http://localhost");
        const paramVal = parsed.searchParams.get("0") || parsed.searchParams.get("all") || parsed.searchParams.get("match");
        if (paramVal) {
          req.url = paramVal.startsWith("/") ? paramVal : `/${paramVal}`;
        }
      } catch {}
    }
  }

  try {
    await initializedPromise;
    return app(req, res);
  } catch (error) {
    console.error("Vercel API Initialization Error:", error);
    return res.status(500).json({
      message: "Database or server connection failed. Please check MongoDB Atlas IP whitelist (0.0.0.0/0) and environment variables on Vercel.",
      error: error.message
    });
  }
}
