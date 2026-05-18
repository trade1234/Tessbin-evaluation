import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import TesbinnLogo from "../components/TesbinnLogo.jsx";

const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

function getAuthHeaders(includeJson = false) {
  return {
    ...(includeJson ? { "Content-Type": "application/json" } : {}),
    Authorization: `Bearer ${localStorage.getItem("adminToken") || ""}`
  };
}

function formatDateLabel(value) {
  return value ? new Date(value).toLocaleDateString() : "Date not set";
}

function createInitialForm() {
  return {
    courseId: "",
    batchName: "",
    trainingDate: "",
    sessionType: "Regular",
    sessionLabel: "",
    evaluationOpen: true
  };
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 20h4l10-10-4-4L4 16v4Zm12.2-13.8 1.6-1.6a1.4 1.4 0 0 1 2 0l1.6 1.6a1.4 1.4 0 0 1 0 2L19.8 9.8Z" />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm1 7h2v7h-2v-7Zm4 0h2v7h-2v-7ZM6 8h12l-1 12a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 8Z" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 10V8a5 5 0 1 1 10 0v2h1a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h1Zm2 0h6V8a3 3 0 1 0-6 0v2Z" />
    </svg>
  );
}

function UnlockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M17 10h1a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h9V8a3 3 0 1 0-6 0h-2a5 5 0 1 1 10 0v2Z" />
    </svg>
  );
}

async function readResponsePayload(response) {
  const raw = await response.text();

  if (!raw) {
    return {};
  }

  if (raw.trim().startsWith("<!DOCTYPE") || raw.trim().startsWith("<html")) {
    return {
      message: "The backend response was not recognized. Restart the backend so the latest batch routes are loaded."
    };
  }

  try {
    return JSON.parse(raw);
  } catch {
    return { message: raw };
  }
}

export default function AdminBatchManagementPage() {
  const navigate = useNavigate();
  const [catalog, setCatalog] = useState([]);
  const [batches, setBatches] = useState([]);
  const [form, setForm] = useState(createInitialForm());
  const [editingId, setEditingId] = useState("");
  const [status, setStatus] = useState({ type: "", message: "" });
  const [submitting, setSubmitting] = useState(false);

  const groupedBatches = useMemo(
    () =>
      catalog.map((course) => ({
        ...course,
        batches: batches.filter((item) => item.courseId === course.courseId)
      })),
    [batches, catalog]
  );

  async function loadData() {
    const [catalogResponse, batchesResponse] = await Promise.all([
      fetch(`${apiUrl}/admin/catalog`, { headers: getAuthHeaders() }),
      fetch(`${apiUrl}/admin/batches`, { headers: getAuthHeaders() })
    ]);

    if ([catalogResponse, batchesResponse].some((response) => response.status === 401)) {
      localStorage.removeItem("adminToken");
      navigate("/admin/login");
      return;
    }

    const [catalogData, batchesData] = await Promise.all([catalogResponse.json(), batchesResponse.json()]);
    setCatalog(catalogData.catalog || []);
    setBatches(batchesData.batches || []);
  }

  useEffect(() => {
    loadData().catch(() => {
      setStatus({ type: "error", message: "Failed to load batch management data." });
    });
  }, []);

  function handleLogout() {
    localStorage.removeItem("adminToken");
    navigate("/admin/login");
  }

  function resetForm() {
    setForm(createInitialForm());
    setEditingId("");
    setStatus({ type: "", message: "" });
  }

  function startEdit(batch) {
    setForm({
      courseId: batch.courseId,
      batchName: batch.batchName,
      trainingDate: new Date(batch.trainingDate).toISOString().slice(0, 10),
      sessionType: batch.sessionType || "Regular",
      sessionLabel: batch.sessionLabel || "",
      evaluationOpen: batch.evaluationOpen !== false
    });
    setEditingId(batch._id);
    setStatus({ type: "", message: "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setStatus({ type: "", message: "" });

    try {
      const response = await fetch(
        `${apiUrl}/admin/batches${editingId ? `/${editingId}` : ""}`,
        {
          method: editingId ? "PUT" : "POST",
          headers: getAuthHeaders(true),
          body: JSON.stringify(form)
        }
      );

      const data = await readResponsePayload(response);

      if (response.status === 401) {
        localStorage.removeItem("adminToken");
        navigate("/admin/login");
        return;
      }

      if (!response.ok) {
        setStatus({
          type: "error",
          message: data.message || "Failed to save batch. Check that the backend is restarted and reachable."
        });
        return;
      }

      await loadData();
      resetForm();
      setStatus({
        type: "success",
        message: editingId ? "Batch updated successfully." : "Batch created successfully."
      });
    } catch (error) {
      setStatus({
        type: "error",
        message:
          error instanceof TypeError
            ? "Unable to reach the server. Restart the backend and try again."
            : "Failed to save batch."
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(batch) {
    setStatus({ type: "", message: "" });

    try {
      const response = await fetch(`${apiUrl}/admin/batches/${batch._id}`, {
        method: "DELETE",
        headers: getAuthHeaders()
      });
      const data = await readResponsePayload(response);

      if (response.status === 401) {
        localStorage.removeItem("adminToken");
        navigate("/admin/login");
        return;
      }

      if (!response.ok) {
        setStatus({ type: "error", message: data.message || "Failed to delete batch." });
        return;
      }

      await loadData();

      if (editingId === batch._id) {
        resetForm();
      }

      setStatus({ type: "success", message: "Batch deleted successfully." });
    } catch (error) {
      setStatus({
        type: "error",
        message:
          error instanceof TypeError
            ? "Unable to reach the server. Restart the backend and try again."
            : "Failed to delete batch."
      });
    }
  }

  async function handleToggleOpen(batch) {
    setStatus({ type: "", message: "" });

    try {
      const response = await fetch(`${apiUrl}/admin/batches/${batch._id}`, {
        method: "PUT",
        headers: getAuthHeaders(true),
        body: JSON.stringify({
          courseId: batch.courseId,
          batchName: batch.batchName,
          trainingDate: new Date(batch.trainingDate).toISOString().slice(0, 10),
          sessionType: batch.sessionType || "Regular",
          sessionLabel: batch.sessionLabel || "",
          evaluationOpen: batch.evaluationOpen === false
        })
      });
      const data = await readResponsePayload(response);

      if (response.status === 401) {
        localStorage.removeItem("adminToken");
        navigate("/admin/login");
        return;
      }

      if (!response.ok) {
        setStatus({ type: "error", message: data.message || "Failed to update batch status." });
        return;
      }

      await loadData();
      setStatus({
        type: "success",
        message: batch.evaluationOpen === false ? "Batch unlocked successfully." : "Batch locked successfully."
      });
    } catch (error) {
      setStatus({
        type: "error",
        message:
          error instanceof TypeError
            ? "Unable to reach the server. Restart the backend and try again."
            : "Failed to update batch status."
      });
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
          <strong>Batch Management</strong>
        </div>
        <div className="admin-topbar-actions">
          <Link className="admin-ghost-link" to="/admin">
            Back to Dashboard
          </Link>
          <button className="admin-secondary-button" onClick={handleLogout} type="button">
            Sign Out
          </button>
        </div>
      </header>

      {status.message ? (
        <p className={`admin-inline-status ${status.type === "error" ? "admin-inline-error" : "admin-inline-success"}`}>
          {status.message}
        </p>
      ) : null}

      <div className="admin-workspace">
        <aside className="admin-sidebar">
          <section className="admin-filter-card admin-sidebar-card">
            <div className="admin-filter-header">
              <div>
                <p className="admin-kicker">Batch Form</p>
                <h2>{editingId ? "Edit Batch" : "Create Batch"}</h2>
              </div>
            </div>

            <form className="admin-form-stack" onSubmit={handleSubmit}>
              <label className="admin-field">
                <span>Course</span>
                <select
                  required
                  value={form.courseId}
                  onChange={(event) => setForm((current) => ({ ...current, courseId: event.target.value }))}
                >
                  <option value="">Select a course</option>
                  {catalog.map((course) => (
                    <option key={course.courseId} value={course.courseId}>
                      {course.courseName}
                    </option>
                  ))}
                </select>
              </label>

              <label className="admin-field">
                <span>Batch Name</span>
                <input
                  required
                  value={form.batchName}
                  onChange={(event) => setForm((current) => ({ ...current, batchName: event.target.value }))}
                  placeholder="Batch 129"
                />
              </label>

              <label className="admin-field">
                <span>Session Type</span>
                <select
                  required
                  value={form.sessionType}
                  onChange={(event) => setForm((current) => ({ ...current, sessionType: event.target.value }))}
                >
                  <option value="Regular">Regular</option>
                  <option value="Weekend">Weekend</option>
                  <option value="Night">Night</option>
                </select>
              </label>

              <label className="admin-field">
                <span>Training Date</span>
                <input
                  required
                  type="date"
                  value={form.trainingDate}
                  onChange={(event) => setForm((current) => ({ ...current, trainingDate: event.target.value }))}
                />
              </label>

              <label className="admin-field">
                <span>Session Label</span>
                <input
                  value={form.sessionLabel}
                  onChange={(event) => setForm((current) => ({ ...current, sessionLabel: event.target.value }))}
                  placeholder="Weekend - May 25, 2026"
                />
              </label>

              <label className="admin-toggle-field">
                <input
                  type="checkbox"
                  checked={form.evaluationOpen}
                  onChange={(event) => setForm((current) => ({ ...current, evaluationOpen: event.target.checked }))}
                />
                <span>Open this session for evaluation</span>
              </label>

              <div className="admin-sidebar-actions">
                <button className="admin-primary-button" type="submit" disabled={submitting}>
                  {submitting ? "Saving..." : editingId ? "Update Batch" : "Create Batch"}
                </button>
                <button className="admin-ghost-button" type="button" onClick={resetForm}>
                  {editingId ? "Cancel Editing" : "Clear Form"}
                </button>
              </div>
            </form>
          </section>
        </aside>

        <section className="admin-main">
          <section className="admin-panel-card">
            <div className="admin-section-head">
              <div>
                <p className="admin-kicker">Batch Directory</p>
                <h2>Course Batches</h2>
              </div>
              <p className="admin-section-note">Manage the batch list that appears in the trainee evaluation form.</p>
            </div>

            <div className="admin-batch-grid">
              {groupedBatches.map((course) => (
                <article key={course.courseId} className="admin-batch-course-card">
                  <div className="admin-batch-course-head">
                    <strong>{course.courseName}</strong>
                    <span>{course.batches.length} batches</span>
                  </div>

                  <div className="admin-batch-list">
                    {course.batches.length ? (
                      course.batches.map((batch) => (
                        <div key={batch._id} className="admin-batch-item">
                          <div>
                            <strong>{batch.batchName}</strong>
                            <span>
                              {(batch.sessionLabel || batch.sessionType || "Session")} | {formatDateLabel(batch.trainingDate)} | {batch.evaluationOpen === false ? "Closed" : "Open"}
                            </span>
                          </div>
                          <div className="admin-batch-actions">
                            <button
                              type="button"
                              className={`admin-icon-button ${batch.evaluationOpen === false ? "admin-icon-button-warning" : ""}`}
                              onClick={() => handleToggleOpen(batch)}
                              aria-label={batch.evaluationOpen === false ? "Unlock batch" : "Lock batch"}
                              title={batch.evaluationOpen === false ? "Unlock batch" : "Lock batch"}
                            >
                              {batch.evaluationOpen === false ? <UnlockIcon /> : <LockIcon />}
                            </button>
                            <button
                              type="button"
                              className="admin-icon-button"
                              onClick={() => startEdit(batch)}
                              aria-label="Edit batch"
                              title="Edit batch"
                            >
                              <EditIcon />
                            </button>
                            <button
                              type="button"
                              className="admin-icon-button admin-icon-button-danger"
                              onClick={() => handleDelete(batch)}
                              aria-label="Delete batch"
                              title="Delete batch"
                            >
                              <DeleteIcon />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="admin-empty-note">No batches created for this course yet.</p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
