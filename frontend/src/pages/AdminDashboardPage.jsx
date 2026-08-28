import { useEffect, useState } from "react";
import SummaryBar from "../components/SummaryBar.jsx";
import TesbinnLogo from "../components/TesbinnLogo.jsx";
import { Link, useNavigate } from "../lib/router.jsx";
import { sections } from "../../../shared/formDefinition.js";

import { apiUrl } from "../config/api.js";

const currentDate = new Date();
const recordsPerPage = 10;
const monthOptions = Array.from({ length: 12 }, (_, index) => ({
  value: String(index),
  label: new Intl.DateTimeFormat(undefined, { month: "long" }).format(new Date(2000, index, 1))
}));
const yearOptions = Array.from({ length: 11 }, (_, index) => currentDate.getFullYear() - index);

function getAuthHeaders() {
  return {
    Authorization: `Bearer ${localStorage.getItem("adminToken") || ""}`
  };
}

function formatDateLabel(value) {
  if (!value) {
    return "Not set";
  }

  return new Date(value).toLocaleDateString();
}

function truncateText(value, maxLength = 140) {
  if (!value) {
    return "";
  }

  return value.length > maxLength ? `${value.slice(0, maxLength).trim()}...` : value;
}

function toDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getPeriodRange(period) {
  if (period === "all") {
    return { dateFrom: "", dateTo: "" };
  }

  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const end = new Date(start);

  if (period === "weekly") {
    const daysSinceMonday = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - daysSinceMonday);
    end.setDate(start.getDate() + 6);
  } else if (period === "monthly") {
    start.setDate(1);
    end.setMonth(start.getMonth() + 1, 0);
  } else if (period === "yearly") {
    start.setMonth(0, 1);
    end.setMonth(11, 31);
  }

  return {
    dateFrom: toDateInputValue(start),
    dateTo: toDateInputValue(end)
  };
}

function getMonthRange(year, month) {
  const start = new Date(Number(year), Number(month), 1);
  const end = new Date(Number(year), Number(month) + 1, 0);

  return {
    dateFrom: toDateInputValue(start),
    dateTo: toDateInputValue(end)
  };
}

function DetailItem({ label, value, wide = false }) {
  return (
    <div className={`admin-detail-item${wide ? " admin-detail-item-wide" : ""}`}>
      <span>{label}</span>
      <strong>{value || "Not provided"}</strong>
    </div>
  );
}

function SubmissionDetails({ evaluation, onClose }) {
  const referrals = (evaluation.referrals || []).filter(
    (item) => item.name || item.phoneNumber || item.emailAddress || item.address
  );

  return (
    <div className="admin-detail-overlay" role="presentation" onMouseDown={onClose}>
      <section
        aria-labelledby="submission-detail-title"
        aria-modal="true"
        className="admin-detail-dialog"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header className="admin-detail-header">
          <div>
            <p className="admin-kicker">Evaluation Record</p>
            <h2 id="submission-detail-title">Submission Details</h2>
            <span>{new Date(evaluation.createdAt).toLocaleString()}</span>
          </div>
          <button aria-label="Close submission details" className="admin-detail-close" onClick={onClose} type="button">
            ×
          </button>
        </header>

        <div className="admin-detail-body">
          <section className="admin-detail-section">
            <h3>Training Information</h3>
            <div className="admin-detail-grid">
              <DetailItem label="Course" value={evaluation.courseName} />
              <DetailItem label="Batch" value={evaluation.batchName} />
              <DetailItem label="Training Date" value={formatDateLabel(evaluation.trainingDate)} />
              <DetailItem label="Instructor" value={evaluation.instructorName} />
              <DetailItem label="Session Type" value={evaluation.sessionType} />
              <DetailItem label="Session" value={evaluation.sessionLabel} />
            </div>
          </section>

          <section className="admin-detail-section">
            <h3>Trainee Information</h3>
            <div className="admin-detail-grid">
              <DetailItem label="Email" value={evaluation.traineeEmail} />
              <DetailItem label="Phone Number" value={evaluation.traineePhoneNumber} />
            </div>
          </section>

          {sections.map((section) => (
            <section className="admin-detail-section" key={section.key}>
              <h3>{section.title}</h3>
              <div className="admin-detail-rating-list">
                {section.questions.map((question) => (
                  <div className="admin-detail-rating" key={question.key}>
                    <span>{question.label}</span>
                    <strong>{evaluation.ratings?.[question.key] || "Not provided"}</strong>
                  </div>
                ))}
              </div>
            </section>
          ))}

          <section className="admin-detail-section">
            <h3>Feedback</h3>
            <div className="admin-detail-grid">
              <DetailItem label="Overall Rating" value={evaluation.overallRating} />
              <DetailItem
                label="Heard From"
                value={evaluation.heardFrom === "Other" && evaluation.heardFromOther
                  ? `Other: ${evaluation.heardFromOther}`
                  : evaluation.heardFrom}
              />
              <DetailItem label="Participation Factors" value={evaluation.participationFactors} wide />
              <DetailItem label="Improvement Suggestions" value={evaluation.improvementSuggestions} wide />
              <DetailItem label="Requested Follow-up Trainings" value={evaluation.followUpTrainings} wide />
            </div>
          </section>

          <section className="admin-detail-section">
            <h3>Referrals</h3>
            {referrals.length ? (
              <div className="admin-detail-referrals">
                {referrals.map((referral, index) => (
                  <article className="admin-detail-referral" key={`${evaluation._id}-referral-${index}`}>
                    <strong>Referral {index + 1}</strong>
                    <span>{referral.name || "Name not provided"}</span>
                    <span>{referral.phoneNumber || "Phone not provided"}</span>
                    <span>{referral.emailAddress || "Email not provided"}</span>
                    <span>{referral.address || "Address not provided"}</span>
                  </article>
                ))}
              </div>
            ) : (
              <p className="admin-empty-note">No referrals were included with this submission.</p>
            )}
          </section>
        </div>
      </section>
    </div>
  );
}

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [catalog, setCatalog] = useState([]);
  const [filters, setFilters] = useState({
    courseId: "",
    batchId: "",
    dateFrom: "",
    dateTo: "",
    dateField: "submitted"
  });
  const [period, setPeriod] = useState("all");
  const [calendarDate, setCalendarDate] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(String(currentDate.getMonth()));
  const [selectedYear, setSelectedYear] = useState(String(currentDate.getFullYear()));
  const [summary, setSummary] = useState({ totalSubmissions: 0, overallCounts: {}, questionAverages: [] });
  const [evaluations, setEvaluations] = useState([]);
  const [error, setError] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [selectedEvaluation, setSelectedEvaluation] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  const selectedCourse = catalog.find((item) => item.courseId === filters.courseId);
  const selectedBatch = selectedCourse?.batches?.find((item) => item.batchId === filters.batchId);
  const uniqueCourses = new Set(evaluations.map((item) => item.courseName)).size;
  const latestSubmission = evaluations.length ? new Date(evaluations[0].createdAt).toLocaleString() : "No submissions yet";
  const totalPages = Math.max(1, Math.ceil(evaluations.length / recordsPerPage));
  const pageStart = (currentPage - 1) * recordsPerPage;
  const visibleEvaluations = evaluations.slice(pageStart, pageStart + recordsPerPage);
  const visibleStart = evaluations.length ? pageStart + 1 : 0;
  const visibleEnd = Math.min(pageStart + recordsPerPage, evaluations.length);
  const activeFilterSummary = [
    selectedCourse?.courseName || "All courses",
    selectedBatch ? selectedBatch.batchName : null,
    calendarDate ? `Date ${formatDateLabel(calendarDate)}` : null,
    !calendarDate && filters.dateFrom ? `From ${formatDateLabel(filters.dateFrom)}` : null,
    !calendarDate && filters.dateTo ? `To ${formatDateLabel(filters.dateTo)}` : null
  ]
    .filter(Boolean)
    .join(" | ");
  const courseLabel = selectedCourse?.courseName || "All courses";
  const groupedSessions = Object.values(
    evaluations.reduce((accumulator, item) => {
      const dateKey = new Date(item.trainingDate).toISOString().slice(0, 10);
      const batchKey = item.batchId || item.batchName || "unassigned";
      const key = `${item.courseName}-${batchKey}-${dateKey}`;

      if (!accumulator[key]) {
        accumulator[key] = {
          key,
          courseName: item.courseName,
          batchName: item.batchName || "Unassigned batch",
          trainingDate: item.trainingDate,
          count: 0,
          latestCreatedAt: item.createdAt
        };
      }

      accumulator[key].count += 1;

      if (new Date(item.createdAt) > new Date(accumulator[key].latestCreatedAt)) {
        accumulator[key].latestCreatedAt = item.createdAt;
      }

      return accumulator;
    }, {})
  ).sort((left, right) => new Date(right.trainingDate) - new Date(left.trainingDate));

  const improvementInsights = evaluations
    .filter((item) => item.improvementSuggestions?.trim())
    .slice(0, 5)
    .map((item) => ({
      id: `${item._id}-improvement`,
      courseName: item.courseName,
      trainingDate: item.trainingDate,
      text: item.improvementSuggestions
    }));

  async function loadData() {
    const query = new URLSearchParams(
      Object.entries(filters).filter(([, value]) => Boolean(value))
    ).toString();

    const [catalogResponse, summaryResponse, evaluationsResponse] = await Promise.all([
      fetch(`${apiUrl}/admin/catalog`, { headers: getAuthHeaders() }),
      fetch(`${apiUrl}/admin/summary?${query}`, { headers: getAuthHeaders() }),
      fetch(`${apiUrl}/admin/evaluations?${query}`, { headers: getAuthHeaders() })
    ]);

    if ([catalogResponse, summaryResponse, evaluationsResponse].some((response) => response.status === 401)) {
      localStorage.removeItem("adminToken");
      navigate("/admin/login");
      return;
    }

    if ([catalogResponse, summaryResponse, evaluationsResponse].some((response) => !response.ok)) {
      throw new Error("Dashboard request failed.");
    }

    const [catalogData, summaryData, evaluationsData] = await Promise.all([
      catalogResponse.json(),
      summaryResponse.json(),
      evaluationsResponse.json()
    ]);

    setCatalog(catalogData.catalog || []);
    setSummary(summaryData);
    setEvaluations(evaluationsData.evaluations || []);
    setError("");
  }

  useEffect(() => {
    setCurrentPage(1);
    loadData().catch(() => setError("Failed to load dashboard data."));
  }, [filters.courseId, filters.batchId, filters.dateFrom, filters.dateTo]);

  useEffect(() => {
    if (!selectedEvaluation) return undefined;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setSelectedEvaluation(null);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedEvaluation]);

  function handleLogout() {
    localStorage.removeItem("adminToken");
    navigate("/admin/login");
  }

  function handleResetFilters() {
    setPeriod("all");
    setCalendarDate("");
    setSelectedMonth(String(currentDate.getMonth()));
    setSelectedYear(String(currentDate.getFullYear()));
    setFilters({ courseId: "", batchId: "", dateFrom: "", dateTo: "", dateField: "submitted" });
  }

  function handlePeriodChange(event) {
    const nextPeriod = event.target.value;
    setPeriod(nextPeriod);

    if (nextPeriod !== "custom") {
      setCalendarDate("");
      const dateRange = nextPeriod === "monthly"
        ? getMonthRange(selectedYear, selectedMonth)
        : getPeriodRange(nextPeriod);
      setFilters((current) => ({ ...current, ...dateRange }));
    }
  }

  function handleMonthSelection(month = selectedMonth, year = selectedYear) {
    setSelectedMonth(month);
    setSelectedYear(year);
    setPeriod("monthly");
    setCalendarDate("");
    setFilters((current) => ({ ...current, ...getMonthRange(year, month) }));
  }

  function handleDateChange(field, value) {
    setPeriod("custom");
    setCalendarDate("");
    setFilters((current) => ({ ...current, [field]: value }));
  }

  function handleCalendarDateChange(value) {
    setCalendarDate(value);
    setPeriod(value ? "custom" : "all");
    setFilters((current) => ({
      ...current,
      dateFrom: value,
      dateTo: value
    }));
  }

  async function handleExport() {
    setIsExporting(true);
    setError("");

    try {
      const query = new URLSearchParams(
        Object.entries(filters).filter(([, value]) => Boolean(value))
      ).toString();
      const response = await fetch(`${apiUrl}/admin/export?${query}`, {
        headers: getAuthHeaders()
      });

      if (response.status === 401) {
        localStorage.removeItem("adminToken");
        navigate("/admin/login");
        return;
      }

      if (!response.ok) {
        throw new Error("Export failed.");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "evaluations.csv";
      link.click();
      window.URL.revokeObjectURL(url);
    } catch {
      setError("Failed to export CSV.");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <main className="admin-dashboard-shell admin-dashboard-app">
      <header className="admin-topbar">
        <div className="admin-topbar-brand">
          <div className="admin-brand-lockup admin-brand-lockup-compact">
            <TesbinnLogo className="admin-brand-logo admin-brand-logo-compact" title="Tesbinn logo" />
            <p className="admin-kicker">TESBINN Admin</p>
          </div>
          <strong>Evaluation Operations Console</strong>
        </div>
        <div className="admin-topbar-actions">
          <span className="admin-topbar-scope">{activeFilterSummary}</span>
          <Link className="admin-ghost-link" to="/admin/batches">
            Manage Batches
          </Link>
          <button className="admin-secondary-button" onClick={handleLogout} type="button">
            Sign Out
          </button>
        </div>
      </header>

      {error ? <p className="admin-inline-status admin-inline-error">{error}</p> : null}

      <div className="admin-workspace">
        <aside className="admin-sidebar">
          <section className="admin-filter-card admin-sidebar-card">
            <div className="admin-filter-header">
              <div>
                <p className="admin-kicker">Filters</p>
                <h2>Evaluation Scope</h2>
              </div>
            </div>

            <div className="admin-filter-grid admin-filter-grid-sidebar">
              <label className="admin-field">
                <span>Time Period</span>
                <select value={period} onChange={handlePeriodChange}>
                  <option value="all">All time</option>
                  <option value="daily">Daily (today)</option>
                  <option value="weekly">Weekly (this week)</option>
                  <option value="monthly">Monthly (this month)</option>
                  <option value="yearly">Yearly (this year)</option>
                  <option value="custom">Custom range</option>
                </select>
              </label>
              {period === "monthly" ? (
                <>
                  <label className="admin-field">
                    <span>Month</span>
                    <select
                      value={selectedMonth}
                      onChange={(event) => handleMonthSelection(event.target.value, selectedYear)}
                    >
                      {monthOptions.map((month) => (
                        <option key={month.value} value={month.value}>{month.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="admin-field">
                    <span>Year</span>
                    <select
                      value={selectedYear}
                      onChange={(event) => handleMonthSelection(selectedMonth, event.target.value)}
                    >
                      {yearOptions.map((year) => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </label>
                </>
              ) : null}
              <label className="admin-field">
                <span>Submission Calendar Date</span>
                <input
                  type="date"
                  value={calendarDate}
                  onChange={(event) => handleCalendarDateChange(event.target.value)}
                />
              </label>
              <label className="admin-field">
                <span>Course</span>
                <select
                  value={filters.courseId}
                  onChange={(event) =>
                    setFilters((current) => ({ ...current, courseId: event.target.value, batchId: "" }))
                  }
                >
                  <option value="">All courses</option>
                  {catalog.map((course) => (
                    <option key={course.courseId} value={course.courseId}>
                      {course.courseName}
                    </option>
                  ))}
                </select>
              </label>
              <label className="admin-field">
                <span>Batch</span>
                <select
                  value={filters.batchId}
                  onChange={(event) => setFilters((current) => ({ ...current, batchId: event.target.value }))}
                  disabled={!selectedCourse}
                >
                  <option value="">{selectedCourse ? "All batches" : "Select course first"}</option>
                  {selectedCourse?.batches?.map((batch) => (
                    <option key={batch.batchId} value={batch.batchId}>
                      {batch.batchName} - {formatDateLabel(batch.trainingDate)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="admin-field">
                <span>Submitted From</span>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(event) => handleDateChange("dateFrom", event.target.value)}
                />
              </label>
              <label className="admin-field">
                <span>Submitted To</span>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(event) => handleDateChange("dateTo", event.target.value)}
                />
              </label>
            </div>

            <div className="admin-sidebar-actions">
              <button className="admin-primary-button admin-export-button" onClick={handleExport} type="button">
                {isExporting ? "Exporting..." : "Export CSV"}
              </button>
              <button className="admin-ghost-button" onClick={handleResetFilters} type="button">
                Reset Filters
              </button>
            </div>
          </section>

          <section className="admin-panel-card admin-sidebar-card">
            <div className="admin-section-head">
              <div>
                <p className="admin-kicker">Session View</p>
                <h2>Course Sessions</h2>
              </div>
            </div>
            <div className="admin-session-list">
              {groupedSessions.length ? (
                groupedSessions.slice(0, 8).map((session) => (
                  <article key={session.key} className="admin-session-item">
                    <strong>{session.courseName}</strong>
                    <span>{session.batchName} | {formatDateLabel(session.trainingDate)}</span>
                    <em>{session.count} submissions</em>
                  </article>
                ))
              ) : (
                <p className="admin-empty-note">No grouped sessions available for the selected filters.</p>
              )}
            </div>
          </section>
        </aside>

        <section className="admin-main">
          <section className="admin-dashboard-hero">
            <div className="admin-dashboard-copy">
              <p className="admin-kicker">Dashboard Overview</p>
              <h1>Training Evaluation Insights</h1>
              <p>
                Monitor submissions, review course-by-course feedback, and inspect qualitative responses from participants.
              </p>
            </div>

            <div className="admin-hero-actions">
              <div className="admin-hero-badge">
                <span>Current Scope</span>
                <strong>{selectedBatch ? `${courseLabel} | ${selectedBatch.batchName}` : courseLabel}</strong>
              </div>
              <div className="admin-hero-badge">
                <span>Latest Submission</span>
                <strong>{latestSubmission}</strong>
              </div>
            </div>
          </section>

          <section className="admin-stat-grid">
            <article className="admin-stat-card">
              <p>Total Submissions</p>
              <strong>{summary.totalSubmissions}</strong>
              <span>All captured evaluation forms in the current scope.</span>
            </article>

            <article className="admin-stat-card">
              <p>Courses Represented</p>
              <strong>{uniqueCourses}</strong>
              <span>Distinct courses represented in the filtered results.</span>
            </article>

            <article className="admin-stat-card">
              <p>Session Groups</p>
              <strong>{groupedSessions.length}</strong>
              <span>Grouped by course, batch, and training date for admin review.</span>
            </article>
          </section>

          <section className="admin-analytics-grid">
            <article className="admin-panel-card">
              <div className="admin-section-head">
                <div>
                  <p className="admin-kicker">Ratings</p>
                  <h2>Overall Rating Mix</h2>
                </div>
              </div>
              <div className="admin-mix-list">
                {Object.entries(summary.overallCounts || {}).map(([label, value]) => (
                  <div key={label} className="admin-mix-row">
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
            </article>

            <article className="admin-panel-card admin-chart-card">
              <div className="admin-section-head">
                <div>
                  <p className="admin-kicker">Metrics</p>
                  <h2>Question Averages</h2>
                </div>
              </div>
              <div className="admin-summary-stack">
                {summary.questionAverages?.map((item) => (
                  <SummaryBar key={item.key} label={item.label} value={item.average} />
                ))}
              </div>
            </article>
          </section>

          <section className="admin-feedback-grid admin-feedback-grid-single">
            <article className="admin-panel-card">
              <div className="admin-section-head">
                <div>
                  <p className="admin-kicker">Improvements</p>
                  <h2>Improvement Suggestions</h2>
                </div>
              </div>
              <div className="admin-text-list">
                {improvementInsights.length ? (
                  improvementInsights.map((item) => (
                    <article key={item.id} className="admin-text-card">
                      <strong>{item.courseName}</strong>
                      <span>{formatDateLabel(item.trainingDate)}</span>
                      <p>{truncateText(item.text)}</p>
                    </article>
                  ))
                ) : (
                  <p className="admin-empty-note">No improvement suggestions were submitted in the current scope.</p>
                )}
              </div>
            </article>

          </section>

          <section className="admin-panel-card">
            <div className="admin-section-head">
              <div>
                <p className="admin-kicker">Records</p>
                <h2>Recent Submissions</h2>
              </div>
              <p className="admin-section-note">Operational grouping is based on course, batch, and training date.</p>
            </div>
            <div className="admin-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Submitted</th>
                    <th>Course</th>
                    <th>Batch</th>
                    <th>Training Date</th>
                    <th>Overall</th>
                    <th>Heard From</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleEvaluations.map((item) => (
                    <tr
                      className="admin-record-row"
                      key={item._id}
                      onDoubleClick={() => setSelectedEvaluation(item)}
                      title="Double-click to view submission details"
                    >
                      <td>{new Date(item.createdAt).toLocaleString()}</td>
                      <td>{item.courseName}</td>
                      <td>{item.batchName || "Unassigned"}</td>
                      <td>{new Date(item.trainingDate).toLocaleDateString()}</td>
                      <td>{item.overallRating}</td>
                      <td>{item.heardFrom}</td>
                      <td>
                        <button
                          className="admin-view-button"
                          onClick={() => setSelectedEvaluation(item)}
                          type="button"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!evaluations.length ? (
                    <tr>
                      <td colSpan="7" className="admin-empty-cell">No submissions found for the current filters.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
            {evaluations.length ? (
              <nav aria-label="Submission records pagination" className="admin-pagination">
                <p>Showing {visibleStart}–{visibleEnd} of {evaluations.length} records</p>
                <div className="admin-pagination-controls">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                    type="button"
                  >
                    Previous
                  </button>
                  <span>Page {currentPage} of {totalPages}</span>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                    type="button"
                  >
                    Next
                  </button>
                </div>
              </nav>
            ) : null}
          </section>
        </section>
      </div>

      {selectedEvaluation ? (
        <SubmissionDetails evaluation={selectedEvaluation} onClose={() => setSelectedEvaluation(null)} />
      ) : null}
    </main>
  );
}
