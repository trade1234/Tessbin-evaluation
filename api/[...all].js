import app, { initializeApp } from "../backend/src/app.js";

let initializedPromise;

export default async function handler(req, res) {
  if (!initializedPromise) {
    initializedPromise = initializeApp();
  }

  await initializedPromise;
  return app(req, res);
}
