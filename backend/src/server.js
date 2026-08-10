import dotenv from "dotenv";

dotenv.config({ path: new URL("../.env", import.meta.url) });

const { default: app, initializeApp } = await import("./app.js");

const port = process.env.PORT || 5000;

initializeApp()
  .then(() => {
    app.listen(port, () => {
      console.log(`Server listening on http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error("Database connection failed:", error.message);
    process.exit(1);
  });
