import nodemailer from "nodemailer";

function isEmailConfigured() {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS &&
      process.env.EMAIL_FROM &&
      process.env.EMAIL_TO
  );
}

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

function formatDate(value) {
  if (!value) {
    return "Not set";
  }

  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function buildEvaluationEmail(evaluation) {
  const referrals = (evaluation.referrals || [])
    .filter((item) => item.name || item.phoneNumber || item.address || item.emailAddress)
    .map(
      (item, index) =>
        `${index + 1}. ${item.name || "No name"} | ${item.phoneNumber || "No phone"} | ${item.emailAddress || "No email"} | ${item.address || "No address"}`
    );

  return [
    "A new training evaluation has been submitted.",
    "",
    `Course: ${evaluation.courseName}`,
    `Session: ${evaluation.sessionLabel || evaluation.batchName}`,
    `Batch ID: ${evaluation.batchId}`,
    `Training date: ${formatDate(evaluation.trainingDate)}`,
    `Overall rating: ${evaluation.overallRating || "Not provided"}`,
    `Heard from: ${evaluation.heardFrom || "Not provided"}${evaluation.heardFromOther ? ` - ${evaluation.heardFromOther}` : ""}`,
    "",
    "Comments",
    `Participation factors: ${evaluation.participationFactors || "Not provided"}`,
    `Improvement suggestions: ${evaluation.improvementSuggestions || "Not provided"}`,
    `Follow-up trainings: ${evaluation.followUpTrainings || "Not provided"}`,
    "",
    "Referrals",
    referrals.length ? referrals.join("\n") : "No referrals provided."
  ].join("\n");
}

export async function sendEvaluationSubmittedEmail(evaluation) {
  if (!isEmailConfigured()) {
    console.warn("Email notification skipped because SMTP environment variables are incomplete.");
    return;
  }

  const transporter = createTransporter();

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: process.env.EMAIL_TO,
    subject: `New evaluation submitted: ${evaluation.courseName}`,
    text: buildEvaluationEmail(evaluation)
  });
}
