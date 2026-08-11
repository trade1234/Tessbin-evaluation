import { useEffect, useState } from "react";
import SummaryBar from "../components/SummaryBar.jsx";
import TesbinnLogo from "../components/TesbinnLogo.jsx";
import { Link, useNavigate } from "../lib/router.jsx";

import { apiUrl } from "../config/api.js";

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

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [catalog, setCatalog] = useState([]);
  const [filters, setFilters] = useState({ courseId: "", batchId: "", dateFrom: "", dateTo: "" });
  const [summary, setSummary] = useState({ totalSubmissions: 0, overallCounts: {}, questionAverages: [] });
  const [evaluations, setEvaluations] = useState([]);
  const [error, setError] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  const selectedCourse = catalog.find((item) => item.courseId === filters.courseId);
  const selectedBatch = selectedCourse?.batches?.find((item) => item.batchId === filters.batchId);
  const uniqueCourses = new Set(evaluations.map((item) => item.courseName)).size;
  const latestSubmission = evaluations.length ? new Date(evaluations[0].createdAt).toLocaleString() : "No submissions yet";
  const activeFilterSummary = [
    selectedCourse?.courseName || "All courses",
    selectedBatch ? selectedBatch.batchName : null,
    filters.dateFrom ? `From ${formatDateLabel(filters.dateFrom)}` : null,
    filters.dateTo ? `To ${formatDateLabel(filters.dateTo)}` : null
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
    loadData().catch(() => setError("Failed to load dashboard data."));
  }, [filters.courseId, filters.batchId, filters.dateFrom, filters.dateTo]);

  function handleLogout() {
    localStorage.removeItem("adminToken");
    navigate("/admin/login");
  }

  function handleResetFilters() {
    setFilters({ courseId: "", batchId: "", dateFrom: "", dateTo: "" });
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
                <span>From Date</span>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(event) => setFilters((current) => ({ ...current, dateFrom: event.target.value }))}
                />
              </label>
              <label className="admin-field">
                <span>To Date</span>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(event) => setFilters((current) => ({ ...current, dateTo: event.target.value }))}
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
                  </tr>
                </thead>
                <tbody>
                  {evaluations.map((item) => (
                    <tr key={item._id}>
                      <td>{new Date(item.createdAt).toLocaleString()}</td>
                      <td>{item.courseName}</td>
                      <td>{item.batchName || "Unassigned"}</td>
                      <td>{new Date(item.trainingDate).toLocaleDateString()}</td>
                      <td>{item.overallRating}</td>
                      <td>{item.heardFrom}</td>
                    </tr>
                  ))}
                  {!evaluations.length ? (
                    <tr>
                      <td colSpan="6" className="admin-empty-cell">No submissions found for the current filters.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
