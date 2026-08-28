import { useEffect, useMemo, useRef, useState } from "react";
import tesbinnLogo from "../assets/tesbinn-logo.png";
import { overallOptions, ratingLabels, sections, sourceOptions } from "../../../shared/formDefinition.js";

import { apiUrl } from "../config/api.js";
const draftStorageKey = "training-evaluation-draft-v3";
const googleReviewUrl = "https://g.page/r/CWgOATTV5eTTEBM/review";

function createInitialForm() {
  return {
    courseId: "",
    batchId: "",
    traineeEmail: "",
    traineePhoneNumber: "",
    ratings: Object.fromEntries(
      sections.flatMap((section) => section.questions.map((question) => [question.key, ""]))
    ),
    improvementSuggestions: "",
    referrals: [],
    heardFrom: "",
    heardFromOther: "",
    overallRating: ""
  };
}

function RatingOptionGrid({ options, value, onChange }) {
  return (
    <div className="rating-scale-shell">
      <div className="rating-scale-header">
        <span>Lower</span>
        <span>Higher</span>
      </div>
      <div className="rating-tile-grid">
      {options.map((option) => (
        <label key={option} className={`rating-tile ${value === option ? "rating-tile-active" : ""}`}>
          <input
            type="radio"
            checked={value === option}
            onChange={() => onChange(option)}
          />
          <span className="rating-tile-dot" aria-hidden="true" />
          <span className="rating-tile-title">{option}</span>
        </label>
      ))}
      </div>
    </div>
  );
}

function SourceOptionGrid({ options, value, onChange }) {
  return (
    <div className="source-option-grid">
      {options.map((option) => (
        <label key={option} className={`source-option-card ${value === option ? "source-option-card-active" : ""}`}>
          <input
            type="radio"
            checked={value === option}
            onChange={() => onChange(option)}
          />
          <span className="source-option-check" aria-hidden="true" />
          <span className="source-option-title">{option}</span>
        </label>
      ))}
    </div>
  );
}

function TraineeHeaderNotice() {
  return (
    <div className="trainee-header-notice">
      <div className="trainee-notice-language" lang="am">
        <p>ውድ ሰልጣኞቻችን የናንተ አስተያየትና ግምገማ ለኛ በጣም አስፈላጊ ነው።</p>
        <p>
          አስተያየቶን ሲጨርሱ ሊንኩን ተጭነው{" "}
          <a href={googleReviewUrl} target="_blank" rel="noreferrer">
            TradeEthiopia School of Business and Innovation
          </a>{" "}
          Google ላይ ኮከቦችን በመስጠት ያበረታቱን።
        </p>
        <p>እባክዎ አስተያየትዎን እንደጨረሱ ከአሰልጣኞት የሰርተፊኬት እና COC ፎርም ይውሰዱ።</p>
        <p>ከልብ እናመሰግናለን!</p>
      </div>

      <div className="trainee-notice-language">
        <p>Dear our trainees, your feedback and evaluation are very important to us.</p>
        <p>
          After completing your feedback, please click the link below and support{" "}
          <a href={googleReviewUrl} target="_blank" rel="noreferrer">
            TradeEthiopia School of Business and Innovation
          </a>{" "}
          by giving us stars and a review on Google.
        </p>
        <p>Please collect your Certificate and COC form from your trainer after submitting your feedback.</p>
        <p>Call +251929243367 | +251904944444 for direct call feedback.</p>
        <p>E-Mail: feedback@tesbinn.com</p>
        <p>Thank you sincerely!</p>
      </div>
    </div>
  );
}

const stepConfigs = [
  {
    key: "training",
    label: "Training",
    title: "Training Evaluation",
    subtitle: "Provide the training information and complete the trainer ratings.",
    heroClass: "hero-art-info"
  },
  {
    key: "feedback",
    label: "Feedback",
    title: "Comments and Referrals",
    subtitle: "Optionally share a comment or recommend people who may benefit from this training.",
    heroClass: "hero-art-comments"
  },
  {
    key: "final",
    label: "Finally",
    title: "Final Evaluation",
    subtitle: "Tell us how you heard about us and give your overall rating.",
    heroClass: "hero-art-final"
  },
  {
    key: "review",
    label: "Review",
    title: "Review Your Responses",
    subtitle: "Check your answers before submitting the evaluation.",
    heroClass: "hero-art-review"
  }
];

const sectionMap = Object.fromEntries(sections.map((section) => [section.key, section]));
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function formatSessionLabel(batch) {
  if (batch.sessionLabel?.trim()) {
    return batch.sessionLabel;
  }

  const dateLabel = batch.trainingDate
    ? new Date(batch.trainingDate).toLocaleDateString()
    : "Date not set";

  return `${batch.sessionType || "Session"} - ${dateLabel}`;
}

export default function EvaluationPage() {
  const [catalog, setCatalog] = useState([]);
  const [form, setForm] = useState(createInitialForm);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [currentStep, setCurrentStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [showBottomActionBar, setShowBottomActionBar] = useState(false);
  const actionTriggerRef = useRef(null);
  const successTimerRef = useRef(null);

  useEffect(() => {
    try {
      const savedDraft = window.localStorage.getItem(draftStorageKey);

      if (!savedDraft) {
        return;
      }

      const parsedDraft = JSON.parse(savedDraft);

      if (parsedDraft?.form) {
        setForm((current) => ({
          ...current,
          ...parsedDraft.form,
          ratings: {
            ...current.ratings,
            ...(parsedDraft.form.ratings || {})
          },
          referrals: Array.isArray(parsedDraft.form.referrals) ? parsedDraft.form.referrals : current.referrals
        }));
      }

      if (typeof parsedDraft?.currentStep === "number") {
        setCurrentStep(Math.max(0, Math.min(parsedDraft.currentStep, stepConfigs.length - 1)));
      }
    } catch {
      window.localStorage.removeItem(draftStorageKey);
    }
  }, []);

  useEffect(() => {
    fetch(`${apiUrl}/public/metadata`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Metadata request failed.");
        }
        return response.json();
      })
      .then((data) => setCatalog(data.catalog || []))
      .catch(() => {
        setStatus({ type: "error", message: "Failed to load training metadata." });
      });
  }, []);

  useEffect(() => {
    if (isSubmitted) {
      return;
    }

    window.localStorage.setItem(
      draftStorageKey,
      JSON.stringify({
        form,
        currentStep
      })
    );
  }, [form, currentStep, isSubmitted]);

  useEffect(() => {
    const node = actionTriggerRef.current;

    if (!node) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowBottomActionBar(entry.isIntersecting);
      },
      {
        root: null,
        threshold: 0.2
      }
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [currentStep, isSubmitted]);

  useEffect(() => {
    return () => {
      if (successTimerRef.current) {
        window.clearTimeout(successTimerRef.current);
      }
    };
  }, []);

  const activeStep = stepConfigs[currentStep];
  const selectedCourse = catalog.find((item) => item.courseId === form.courseId);
  const availableSessions = (selectedCourse?.batches || []).filter((item) => item.evaluationOpen !== false);
  const selectedBatch = availableSessions.find((item) => item.batchId === form.batchId);
  const progress = Math.round(((currentStep + 1) / stepConfigs.length) * 100);

  const reviewItems = useMemo(
    () => [
      {
        label: "Training Information",
        value: [
          selectedCourse?.courseName || "No course selected",
          selectedBatch ? formatSessionLabel(selectedBatch) : "No session selected",
          form.traineeEmail || "No email added",
          form.traineePhoneNumber || "No phone number added"
        ].join(" | "),
        editStep: 0
      },
      {
        label: "Trainer Evaluation",
        value: `${sectionMap.presentation.questions.length} questions answered`,
        editStep: 0
      },
      {
        label: "Comments and Suggestions",
        value: form.improvementSuggestions ? "1 response added" : "No response added",
        editStep: 1
      },
      {
        label: "Suggested People",
        value: `${form.referrals.filter((item) => item.name || item.phoneNumber || item.address || item.emailAddress).length} referrals added`,
        editStep: 1
      },
      {
        label: "Final Evaluation",
        value: form.overallRating ? `Overall rating: ${form.overallRating}` : "Not completed",
        editStep: 2
      }
    ],
    [form, selectedBatch, selectedCourse]
  );

  function updateRating(key, value) {
    setForm((current) => ({
      ...current,
      ratings: { ...current.ratings, [key]: value }
    }));
  }

  function updateReferral(index, field, value) {
    setForm((current) => ({
      ...current,
      referrals: current.referrals.map((referral, referralIndex) =>
        referralIndex === index ? { ...referral, [field]: value } : referral
      )
    }));
  }

  function addReferral() {
    setForm((current) => {
      if (current.referrals.length >= 6) {
        return current;
      }

      return {
        ...current,
        referrals: [
          ...current.referrals,
          {
            name: "",
            phoneNumber: "",
            address: "",
            emailAddress: ""
          }
        ]
      };
    });
  }

  function removeReferral(index) {
    setForm((current) => ({
      ...current,
      referrals: current.referrals.filter((_, itemIndex) => itemIndex !== index)
    }));
  }

  function validateStep(stepKey = activeStep.key) {
    if (stepKey === "info") {
      const email = form.traineeEmail.trim();
      return Boolean(form.courseId && form.batchId && (!email || emailPattern.test(email)));
    }

    if (sectionMap[stepKey]) {
      return sectionMap[stepKey].questions.every((question) => Boolean(form.ratings[question.key]));
    }

    if (stepKey === "final") {
      return Boolean(form.heardFrom && form.overallRating && (form.heardFrom !== "Other" || form.heardFromOther.trim()));
    }

    if (stepKey === "training") {
      return validateStep("info") && validateStep("presentation");
    }

    return true;
  }

  function goNext() {
    if (!validateStep()) {
      setStatus({ type: "error", message: "Please complete this step before continuing." });
      return;
    }

    setStatus({ type: "", message: "" });
    setCurrentStep((step) => Math.min(step + 1, stepConfigs.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goBack() {
    setStatus({ type: "", message: "" });
    setCurrentStep((step) => Math.max(step - 1, 0));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!validateStep("info") || !validateStep("presentation") || !validateStep("final")) {
      setStatus({ type: "error", message: "Please complete all required steps before submitting." });
      return;
    }

    setStatus({ type: "", message: "" });
    setSubmitting(true);
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(`${apiUrl}/public/evaluations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
        signal: controller.signal
      });

      const raw = await response.text();
      let data = {};

      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = { message: raw || "Unexpected server response." };
      }

      if (!response.ok) {
        setStatus({ type: "error", message: data.message || "Submission failed." });
        return;
      }

      setStatus({
        type: "success",
        message: "Thank you. Your evaluation has been submitted successfully."
      });
      window.localStorage.removeItem(draftStorageKey);
      setShowSuccessToast(true);
      successTimerRef.current = window.setTimeout(() => {
        setShowSuccessToast(false);
        setIsSubmitted(true);
      }, 600);
    } catch (error) {
      const isTimeout = error?.name === "TimeoutError" || error?.name === "AbortError" || String(error?.message).includes("timed out");
      setStatus({
        type: "error",
        message: isTimeout
          ? "The request timed out while connecting to the server. Please try again."
          : error instanceof TypeError
            ? "Unable to reach the server. Make sure the backend is running."
            : error instanceof Error
              ? error.message
              : "Submission failed. Please try again."
      });
    } finally {
      window.clearTimeout(timeoutId);
      setSubmitting(false);
    }
  }

  function renderInfoStep() {
    return (
      <section className="mobile-section-card">
        <div className="mobile-section-heading">
          <h2>Training Information</h2>
        </div>
        <div className="field-stack">
            <label className="app-field">
              <span>Course</span>
              <select
                required
                value={form.courseId}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    courseId: event.target.value,
                    batchId: ""
                  }))
                }
              >
                <option value="">Select a course</option>
                {catalog.map((course) => (
                  <option key={course.courseId} value={course.courseId}>
                    {course.courseName}
                  </option>
                ))}
              </select>
            </label>

            <label className="app-field">
              <span>Session</span>
              <select
                required
                value={form.batchId}
                onChange={(event) => setForm((current) => ({ ...current, batchId: event.target.value }))}
                disabled={!selectedCourse}
              >
                <option value="">{selectedCourse ? "Select a session" : "Select course first"}</option>
                {availableSessions.map((batch) => (
                  <option key={batch.batchId} value={batch.batchId}>
                    {formatSessionLabel(batch)}
                  </option>
                ))}
              </select>
            </label>

            {/* Show instructor name if available for the selected batch */}
            {selectedBatch?.instructorName && (
              <div style={{ margin: "0.5em 0 0.5em 0", color: "#18324d", fontWeight: 500 }}>
                Instructor: {selectedBatch.instructorName}
              </div>
            )}

            <label className="app-field">
              <span>Email Address (Optional)</span>
              <input
                type="email"
                placeholder="Enter your email address if desired"
                value={form.traineeEmail}
                onChange={(event) => setForm((current) => ({ ...current, traineeEmail: event.target.value }))}
              />
            </label>

            <label className="app-field">
              <span>Phone Number</span>
              <input
                type="tel"
                placeholder="Enter your phone number"
                value={form.traineePhoneNumber}
                onChange={(event) => setForm((current) => ({ ...current, traineePhoneNumber: event.target.value }))}
              />
            </label>
        </div>
      </section>
    );
  }

  function renderInformationNotice() {
    return (
      <section className="tip-card">
        <div className="tip-icon">i</div>
        <div>
          <h3>Why do we collect this information?</h3>
          <p>This helps admins organize evaluations by course and class session while the internal batch stays attached automatically.</p>
        </div>
      </section>
    );
  }

  function renderRatingsStep(sectionKey) {
    const section = sectionMap[sectionKey];

    return (
      <section className="mobile-section-card">
        <div className="mobile-section-heading">
          <h2>{section.title}</h2>
        </div>
        <div className="question-list">
          {section.questions.map((question, index) => (
            <div key={question.key} className="question-item">
              <h3>
                {index + 1}. {question.label}
              </h3>
              <RatingOptionGrid
                options={ratingLabels}
                value={form.ratings[question.key]}
                onChange={(value) => updateRating(question.key, value)}
              />
            </div>
          ))}
        </div>
      </section>
    );
  }

  function renderCommentsStep() {
    return (
      <section className="mobile-section-card">
        <div className="mobile-section-heading">
          <h2>Comments and Suggestions</h2>
          <p>Optional</p>
        </div>
        <div className="field-stack">
          <label className="app-field">
            <span>Comments or suggestions to improve this training (Optional)</span>
            <textarea
              rows="4"
              placeholder="Share your suggestions..."
              value={form.improvementSuggestions}
              onChange={(event) => setForm((current) => ({ ...current, improvementSuggestions: event.target.value }))}
            />
          </label>

        </div>
      </section>
    );
  }

  function renderReferralsStep() {
    return (
      <section className="mobile-section-card">
        <div className="mobile-section-heading">
          <h2>Suggested People</h2>
          <p>Optional</p>
        </div>
        <div className="referral-stack">
          {!form.referrals.length ? (
            <p className="admin-empty-note">Referrals are optional. Add one only if you would like to recommend someone.</p>
          ) : null}
          {form.referrals.map((referral, index) => (
            <article key={index} className="referral-card-app">
              <div className="referral-card-head">
                <h3>Referral {index + 1}</h3>
                <button type="button" className="inline-link danger-link" onClick={() => removeReferral(index)}>
                  Remove
                </button>
              </div>

              <div className="compact-field-stack">
                <label className="app-field small-field">
                  <span>Name</span>
                  <input
                    value={referral.name}
                    onChange={(event) => updateReferral(index, "name", event.target.value)}
                  />
                </label>
                <label className="app-field small-field">
                  <span>Phone Number</span>
                  <input
                    value={referral.phoneNumber}
                    onChange={(event) => updateReferral(index, "phoneNumber", event.target.value)}
                  />
                </label>
                <label className="app-field small-field">
                  <span>Address</span>
                  <input
                    value={referral.address}
                    onChange={(event) => updateReferral(index, "address", event.target.value)}
                  />
                </label>
                <label className="app-field small-field">
                  <span>Email Address</span>
                  <input
                    type="email"
                    value={referral.emailAddress}
                    onChange={(event) => updateReferral(index, "emailAddress", event.target.value)}
                  />
                </label>
              </div>
            </article>
          ))}
        </div>

        {form.referrals.length < 6 ? (
          <button type="button" className="outline-action-button" onClick={addReferral}>
            {form.referrals.length ? "Add Another Referral" : "Add Referral"}
          </button>
        ) : null}
      </section>
    );
  }

  function renderFinalStep() {
    return (
      <section className="mobile-section-card">
        <div className="field-stack">
          <div className="app-field">
            <span>Where did you get information about this training?</span>
            <SourceOptionGrid
              options={sourceOptions}
              value={form.heardFrom}
              onChange={(value) =>
                setForm((current) => ({
                  ...current,
                  heardFrom: value,
                  heardFromOther: value === "Other" ? current.heardFromOther : ""
                }))
              }
            />

            {form.heardFrom === "Other" ? (
              <div className="source-other-inline">
                <input
                  placeholder="Please specify..."
                  value={form.heardFromOther}
                  onChange={(event) => setForm((current) => ({ ...current, heardFromOther: event.target.value }))}
                />
              </div>
            ) : null}
          </div>

          <div className="question-item no-divider">
            <h3>Overall how would you evaluate this training session?</h3>
            <RatingOptionGrid
              options={overallOptions}
              value={form.overallRating}
              onChange={(value) => setForm((current) => ({ ...current, overallRating: value }))}
            />
          </div>
        </div>
      </section>
    );
  }

  function renderReviewStep() {
    return (
      <section className="mobile-section-card">
        <div className="review-stack">
          {reviewItems.map((item) => (
            <article key={item.label} className="review-item-card">
              <div>
                <h3>{item.label}</h3>
                <p>{item.value}</p>
              </div>
              <button type="button" className="inline-link" onClick={() => setCurrentStep(item.editStep)}>
                Edit
              </button>
            </article>
          ))}
        </div>
      </section>
    );
  }

  function renderCurrentStep() {
    if (activeStep.key === "training") {
      return (
        <>
          {renderInfoStep()}
          {renderRatingsStep("presentation")}
          {renderInformationNotice()}
        </>
      );
    }
    if (activeStep.key === "feedback") {
      return (
        <>
          {renderCommentsStep()}
          {renderReferralsStep()}
        </>
      );
    }
    if (activeStep.key === "final") return renderFinalStep();
    return renderReviewStep();
  }

  function restartEvaluation() {
    if (successTimerRef.current) {
      window.clearTimeout(successTimerRef.current);
    }
    window.localStorage.removeItem(draftStorageKey);
    setForm(createInitialForm());
    setCurrentStep(0);
    setStatus({ type: "", message: "" });
    setIsSubmitted(false);
    setShowSuccessToast(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (isSubmitted) {
    return (
      <main className="mobile-app-shell">
        <section className="app-hero success-hero">
          <div className="hero-copy success-copy">
            <h1>Thank You!</h1>
            <p>Your evaluation has been submitted successfully.</p>
          </div>

          <div className="hero-art hero-art-success">
            <div className="success-badge">
              <span>OK</span>
            </div>
          </div>
        </section>

        <section className="mobile-section-card success-card">
          <div className="success-stack">
            <article className="success-confirmation-banner">
              <h3>Evaluation saved successfully</h3>
              <p>Your responses have been recorded and stored in the system.</p>
            </article>
            <article className="success-note-card">
              <h3>Your feedback makes a difference</h3>
              <p>Your feedback helps improve future trainings and participant experience.</p>
            </article>
            <article className="success-note-card">
              <h3>Stronger training programs</h3>
              <p>Your input helps identify what worked well and what needs refinement.</p>
            </article>
            <article className="success-note-card">
              <h3>Better learning outcomes</h3>
              <p>We use the results to shape more relevant future sessions.</p>
            </article>
          </div>
        </section>

        <div className="app-footer-actions single-action">
          <button type="button" className="primary-nav-button" onClick={restartEvaluation}>
            Start New Evaluation
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="mobile-app-shell">
      {showSuccessToast ? (
        <div className="success-toast" role="status" aria-live="polite">
          <div className="success-toast-icon">OK</div>
          <div>
            <strong>Evaluation saved successfully</strong>
            <span>Your responses have been recorded.</span>
          </div>
        </div>
      ) : null}

      <section className="app-hero">
        <div className="app-top-row">
          <button
            type="button"
            className="hero-icon-button"
            onClick={goBack}
            disabled={currentStep === 0}
            aria-label="Go back"
          >
            <span>&lt;</span>
          </button>
          <div className="hero-logo-shell" aria-label="Tesbinn logo">
            <img src={tesbinnLogo} alt="Tesbinn" className="hero-logo-image" />
          </div>
        </div>

        <div className="hero-copy">
          <h1>{activeStep.title}</h1>
          <p>{activeStep.subtitle}</p>
        </div>

        <TraineeHeaderNotice />

        <div className={`hero-art ${activeStep.heroClass}`}>
          <div className="hero-orb hero-orb-large" />
          <div className="hero-orb hero-orb-small" />
          <div className="hero-card-illustration">
            <div className="hero-card-clip" />
            <div className="hero-card-lines">
              <span />
              <span />
              <span />
              <span />
            </div>
          </div>
        </div>
      </section>

      <section className="progress-card">
        <p className="progress-copy">
          Step {currentStep + 1} of {stepConfigs.length} <strong>{progress}% Completed</strong>
        </p>
        <div className="progress-bar">
          <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
        </div>

        <div className="step-rail" aria-label="Evaluation steps">
          {stepConfigs.map((step, index) => {
            const isCurrent = index === currentStep;
            const isComplete = index < currentStep;

            return (
              <button
                key={step.key}
                type="button"
                className={`step-node ${isCurrent ? "step-node-current" : ""} ${isComplete ? "step-node-complete" : ""}`}
                onClick={() => setCurrentStep(index)}
              >
                <span className="step-node-circle">{isComplete ? "OK" : index + 1}</span>
                <span className="step-node-label">{step.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {renderCurrentStep()}

      {status.message ? (
        <p className={`status-message ${status.type === "error" ? "status-error" : "status-success"}`}>
          {status.message}
        </p>
      ) : null}

      <div ref={actionTriggerRef} className="action-bar-trigger" aria-hidden="true" />

      {showBottomActionBar ? (
        <form onSubmit={handleSubmit} className="floating-action-bar">
          <button
            type="button"
            className="secondary-nav-button"
            onClick={goBack}
            disabled={currentStep === 0}
          >
            Back
          </button>

          {currentStep < stepConfigs.length - 1 ? (
            <button type="button" className="primary-nav-button" onClick={goNext}>
              Continue
            </button>
          ) : (
            <button type="submit" className="primary-nav-button" disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Evaluation"}
            </button>
          )}
        </form>
      ) : null}
    </main>
  );
}
