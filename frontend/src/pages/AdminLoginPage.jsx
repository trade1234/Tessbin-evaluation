import { useState } from "react";
import TesbinnLogo from "../components/TesbinnLogo.jsx";
import { useNavigate } from "../lib/router.jsx";

const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch(`${apiUrl}/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials)
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.message || "Login failed.");
        return;
      }

      localStorage.setItem("adminToken", data.token);
      navigate("/admin");
    } catch {
      setError("Unable to reach the server. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="admin-auth-shell">
      <section className="admin-auth-card">
        <div className="admin-auth-brand">
          <div className="admin-brand-lockup">
            <TesbinnLogo className="admin-brand-logo" title="Tesbinn logo" />
            <div>
              <p className="admin-kicker">TESBINN Admin</p>
            </div>
          </div>
          <h1>Evaluation Operations Console</h1>
          <p>
            Secure access for reviewing submissions, tracking course sessions, and exporting evaluation data.
          </p>
          <div className="admin-auth-highlights">
            <div>
              <strong>Course Reports</strong>
              <span>Filter results by course and training date.</span>
            </div>
            <div>
              <strong>Response Analytics</strong>
              <span>Review overall scores and question-level averages.</span>
            </div>
          </div>
        </div>

        <div className="admin-auth-panel">
          <p className="admin-kicker">Sign In</p>
          <h2>Administrator Login</h2>
          <form className="admin-form-stack" onSubmit={handleSubmit}>
            <label className="admin-field">
              <span>Username</span>
              <input
                required
                autoComplete="username"
                value={credentials.username}
                onChange={(event) => setCredentials((current) => ({ ...current, username: event.target.value }))}
              />
            </label>

            <label className="admin-field">
              <span>Password</span>
              <input
                required
                type="password"
                autoComplete="current-password"
                value={credentials.password}
                onChange={(event) => setCredentials((current) => ({ ...current, password: event.target.value }))}
              />
            </label>

            {error ? <p className="admin-inline-status admin-inline-error">{error}</p> : null}

            <button className="admin-primary-button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Signing in..." : "Access Dashboard"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
