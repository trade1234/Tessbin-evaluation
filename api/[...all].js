import app, { initializeApp } from "../backend/src/app.js";

let initializedPromise;

export default async function handler(req, res) {
  if (!initializedPromise) {
    initializedPromise = initializeApp().catch((error) => {
      initializedPromise = undefined;
      throw error;
    });
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
