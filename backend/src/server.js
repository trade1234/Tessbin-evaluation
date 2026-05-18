import "dotenv/config";
import app, { initializeApp } from "./app.js";

const port = process.env.PORT || 5000;

initializeApp()
  .then(() => {
    app.listen(port, () => {
      console.log(`Server listening on port ${port}`);
    });
  })
  .catch((error) => {
    console.error("Database connection failed:", error.message);
    process.exit(1);
  });
