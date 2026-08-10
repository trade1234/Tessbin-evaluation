import nodemailer from "nodemailer";
import { sections } from "../../../shared/formDefinition.js";

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
    },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 10000,
    disableFileAccess: true,
    disableUrlAccess: true
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
  const ratings = sections.flatMap((section) => [
    "",
    section.title,
    ...section.questions.map((question) => {
      const value = evaluation.ratings?.[question.key] || "Not provided";
      return `- ${question.label}: ${value}`;
    })
  ]);

  return [
    "A new training evaluation has been submitted.",
    "",
    "Training Information",
    `Course ID: ${evaluation.courseId}`,
    `Course name: ${evaluation.courseName}`,
    `Batch ID: ${evaluation.batchId}`,
    `Batch name: ${evaluation.batchName || "Not provided"}`,
    `Session: ${evaluation.sessionLabel || evaluation.batchName}`,
    `Session type: ${evaluation.sessionType || "Not provided"}`,
    `Instructor: ${evaluation.instructorName || "Not provided"}`,
    `Trainee email: ${evaluation.traineeEmail || "Not provided"}`,
    `Trainee phone number: ${evaluation.traineePhoneNumber || "Not provided"}`,
    `Training date: ${formatDate(evaluation.trainingDate)}`,
    `Submitted at: ${evaluation.createdAt ? new Date(evaluation.createdAt).toLocaleString("en-US") : "Not available"}`,
    "",
    "Ratings",
    ...ratings,
    "",
    "Final Evaluation",
    `Overall rating: ${evaluation.overallRating || "Not provided"}`,
    `Heard from: ${evaluation.heardFrom || "Not provided"}${evaluation.heardFromOther ? ` - ${evaluation.heardFromOther}` : ""}`,
    "",
    "Comments",
    `Improvement suggestions: ${evaluation.improvementSuggestions || "Not provided"}`,
    "",
    "Referrals",
    referrals.length ? referrals.join("\n") : "No referrals provided."
  ].join("\n");
}

function buildTraineeConfirmationEmail(evaluation) {
  return [
    "Dear trainee,",
    "",
    "Thank you for submitting your training evaluation.",
    "",
    `Course: ${evaluation.courseName}`,
    `Session: ${evaluation.sessionLabel || evaluation.batchName}`,
    `Training date: ${formatDate(evaluation.trainingDate)}`,
    "",
    "Your feedback has been received by TradeEthiopia School of Business and Innovation.",
    "",
    "Please collect your Certificate and COC form from your trainer after submitting your feedback.",
    "",
    "For direct feedback, call +251929243367 or +251904944444.",
    "Email: feedback@tesbinn.com",
    "",
    "Thank you sincerely!"
  ].join("\n");
}

export async function sendEvaluationSubmittedEmail(evaluation) {
  if (!isEmailConfigured()) {
    console.warn("Email notification skipped because SMTP environment variables are incomplete.");
    return;
  }

  const transporter = createTransporter();

  const messages = [
    {
      from: process.env.EMAIL_FROM,
      to: process.env.EMAIL_TO,
      replyTo: evaluation.traineeEmail || undefined,
      subject: `New evaluation submitted: ${evaluation.courseName}`,
      text: buildEvaluationEmail(evaluation)
    }
  ];

  if (evaluation.traineeEmail) {
    messages.push({
      from: process.env.EMAIL_FROM,
      to: evaluation.traineeEmail,
      subject: "Your evaluation feedback was received",
      text: buildTraineeConfirmationEmail(evaluation)
    });
  }

  await Promise.all(messages.map((message) => transporter.sendMail(message)));
}
