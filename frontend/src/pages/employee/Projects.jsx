import { useState, useEffect } from "react";
import {
  Calendar,
  FolderKanban,
  Users,
  Clock,
  CheckCircle2,
  User,
} from "lucide-react";
import Layout from "../../components/layout/Layout";
import Toast from "../../components/common/Toast";
import * as api from "../../api/projectApi";

const FONT = "'Inter', 'Segoe UI', -apple-system, sans-serif";

const STATUS_STYLES = {
  ACTIVE: { bg: "#f0fdf4", color: "#14532d", border: "#bbf7d0", label: "Active" },
  COMPLETED: { bg: "#eff6ff", color: "#1e3a8a", border: "#bfdbfe", label: "Completed" },
  ON_HOLD: { bg: "#fef9f3", color: "#78350f", border: "#fde68a", label: "On Hold" },
  PLANNED: { bg: "#f4f4f5", color: "#18181b", border: "#e4e4e7", label: "Planned" },
};

const formatDate = (d) => {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return d;
  }
};

const EmployeeProjects = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    api
      .getMyProjects()
      .then((r) => setItems(Array.isArray(r.data) ? r.data : []))
      .catch(() =>
        setToast({ message: "Failed to load projects", type: "error" })
      )
      .finally(() => setLoading(false));
  }, []);

  const total = items.length;
  const active = items.filter((p) => p.status === "ACTIVE").length;
  const completed = items.filter((p) => p.status === "COMPLETED").length;
  const onHold = items.filter((p) => p.status === "ON_HOLD").length;

  // Sort: active first, then by start date desc
  const sorted = [...items].sort((a, b) => {
    const order = { ACTIVE: 0, PLANNED: 1, ON_HOLD: 2, COMPLETED: 3 };
    const oa = order[a.status] ?? 9;
    const ob = order[b.status] ?? 9;
    if (oa !== ob) return oa - ob;
    return new Date(b.start_date || 0) - new Date(a.start_date || 0);
  });

  return (
    <Layout>
      <style>{`
        .ep-page * { font-family: ${FONT}; }
        .ep-page {
          font-family: ${FONT};
          max-width: 1100px;
          margin: 0 auto;
          color: #18181b;
          padding-bottom: 60px;
          -webkit-font-smoothing: antialiased;
        }

        /* HEADER */
        .ep-header {
          margin-bottom: 32px;
        }
        .ep-title {
          font-size: 32px;
          font-weight: 700;
          color: #09090b;
          letter-spacing: -1px;
          margin-bottom: 6px;
          line-height: 1.1;
        }
        .ep-subtitle {
          font-size: 14px;
          color: #71717a;
          margin: 0;
        }

        /* STATS */
        .ep-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1px;
          background: #e4e4e7;
          border: 1px solid #e4e4e7;
          border-radius: 12px;
          overflow: hidden;
          margin-bottom: 32px;
        }
        .ep-stat {
          background: white;
          padding: 20px 22px;
          transition: background 0.15s;
        }
        .ep-stat:hover { background: #fafafa; }
        .ep-stat-label {
          font-size: 11px;
          font-weight: 500;
          color: #71717a;
          text-transform: uppercase;
          letter-spacing: 0.6px;
          margin-bottom: 8px;
        }
        .ep-stat-value {
          font-size: 26px;
          font-weight: 700;
          color: #09090b;
          line-height: 1;
          letter-spacing: -0.8px;
          font-variant-numeric: tabular-nums;
        }
        .ep-stat-value.muted { color: #a1a1aa; }

        /* SECTION TITLE */
        .ep-section-title {
          font-size: 11.5px;
          font-weight: 600;
          color: #71717a;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          margin-bottom: 14px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .ep-section-title::after {
          content: "";
          flex: 1;
          height: 1px;
          background: #f4f4f5;
        }

        /* PROJECT CARD */
        .ep-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
          gap: 14px;
        }
        .ep-card {
          background: white;
          border: 1px solid #e4e4e7;
          border-radius: 14px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          transition: all 0.15s ease;
        }
        .ep-card:hover {
          border-color: #a1a1aa;
          box-shadow: 0 4px 12px -2px rgba(0,0,0,0.06);
        }

        .ep-card-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
        }
        .ep-card-code {
          font-size: 10.5px;
          font-weight: 700;
          color: #71717a;
          background: #f4f4f5;
          padding: 3px 8px;
          border-radius: 6px;
          letter-spacing: 0.4px;
          text-transform: uppercase;
          font-family: monospace;
        }
        .ep-card-status {
          font-size: 10.5px;
          font-weight: 600;
          padding: 3px 9px;
          border-radius: 6px;
          letter-spacing: 0.3px;
          text-transform: uppercase;
          border: 1px solid;
        }
        .ep-card-name {
          font-size: 16px;
          font-weight: 700;
          color: #09090b;
          letter-spacing: -0.3px;
          line-height: 1.3;
        }
        .ep-card-client {
          font-size: 12px;
          color: #71717a;
          margin-top: 4px;
        }

        /* DATE ROW */
        .ep-dates {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }
        .ep-date-cell {
          background: #fafafa;
          border: 1px solid #f4f4f5;
          border-radius: 10px;
          padding: 10px 12px;
        }
        .ep-date-label {
          font-size: 9.5px;
          font-weight: 600;
          color: #a1a1aa;
          text-transform: uppercase;
          letter-spacing: 0.6px;
          margin-bottom: 3px;
        }
        .ep-date-value {
          font-size: 12.5px;
          font-weight: 600;
          color: #18181b;
          font-variant-numeric: tabular-nums;
        }

        /* PROGRESS */
        .ep-progress-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .ep-progress-bar {
          flex: 1;
          height: 6px;
          background: #f4f4f5;
          border-radius: 3px;
          overflow: hidden;
        }
        .ep-progress-fill {
          height: 100%;
          background: #09090b;
          border-radius: 3px;
          transition: width 0.5s ease;
        }
        .ep-progress-pct {
          font-size: 12px;
          font-weight: 700;
          color: #09090b;
          min-width: 40px;
          text-align: right;
          font-variant-numeric: tabular-nums;
        }

        /* TEAM */
        .ep-team {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 12px;
          border-top: 1px solid #f4f4f5;
        }
        .ep-team-stack {
          display: flex;
        }
        .ep-team-stack > * {
          margin-left: -8px;
          border: 2px solid white;
        }
        .ep-team-stack > *:first-child { margin-left: 0; }
        .ep-avatar {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: #f4f4f5;
          color: #52525b;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: 700;
        }
        .ep-avatar.more {
          background: #09090b;
          color: white;
        }
        .ep-team-count {
          font-size: 11.5px;
          color: #a1a1aa;
          font-weight: 500;
        }

        /* ROLE BADGE */
        .ep-role-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          font-weight: 600;
          color: #52525b;
          background: #f4f4f5;
          padding: 4px 10px;
          border-radius: 6px;
          letter-spacing: 0.2px;
        }

        /* EMPTY / LOADING */
        .ep-empty {
          background: white;
          border: 1px dashed #e4e4e7;
          border-radius: 16px;
          padding: 80px 24px;
          text-align: center;
        }
        .ep-empty-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 64px;
          height: 64px;
          border-radius: 16px;
          background: #f4f4f5;
          color: #52525b;
          margin-bottom: 18px;
        }
        .ep-empty-title {
          font-size: 15px;
          font-weight: 600;
          color: #09090b;
          margin-bottom: 6px;
        }
        .ep-empty-desc {
          font-size: 13px;
          color: #71717a;
        }
        .ep-loading {
          background: white;
          border: 1px solid #e4e4e7;
          border-radius: 12px;
          padding: 80px;
          text-align: center;
          color: #a1a1aa;
          font-size: 13px;
        }

        /* MOBILE */
        @media (max-width: 900px) {
          .ep-stats { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 767px) {
          .ep-page { padding: 0 4px; }
          .ep-title { font-size: 24px; }
          .ep-subtitle { font-size: 13px; }
          .ep-header { margin-bottom: 20px; }
          .ep-stats { margin-bottom: 20px; border-radius: 10px; }
          .ep-stat { padding: 14px 16px; }
          .ep-stat-value { font-size: 22px; }
          .ep-stat-label { font-size: 10px; }
          .ep-grid { grid-template-columns: 1fr; }
          .ep-card { padding: 16px; }
        }
      `}</style>

      <div className="ep-page">
        <div className="ep-header">
          <h1 className="ep-title">My Projects</h1>
          <p className="ep-subtitle">
            Projects assigned to you
          </p>
        </div>

        {loading ? (
          <div className="ep-loading">
            <div className="spinner-border spinner-border-sm me-2" />
            Loading projects...
          </div>
        ) : total === 0 ? (
          <div className="ep-empty">
            <div className="ep-empty-icon">
              <FolderKanban size={28} strokeWidth={1.8} />
            </div>
            <div className="ep-empty-title">No projects assigned</div>
            <div className="ep-empty-desc">
              Manager intha employee ku project assign pannala
            </div>
          </div>
        ) : (
          <>
            {/* STATS */}
            <div className="ep-stats">
              <div className="ep-stat">
                <div className="ep-stat-label">Total</div>
                <div className="ep-stat-value">{total}</div>
              </div>
              <div className="ep-stat">
                <div className="ep-stat-label">Active</div>
                <div className="ep-stat-value">{active}</div>
              </div>
              <div className="ep-stat">
                <div className="ep-stat-label">Completed</div>
                <div className="ep-stat-value">{completed}</div>
              </div>
              <div className="ep-stat">
                <div className="ep-stat-label">On Hold</div>
                <div
                  className={`ep-stat-value ${
                    onHold === 0 ? "muted" : ""
                  }`}
                >
                  {onHold}
                </div>
              </div>
            </div>

            <div className="ep-section-title">
              <FolderKanban size={13} strokeWidth={2.5} />
              Assigned Projects
            </div>

            {/* CARDS */}
            <div className="ep-grid">
              {sorted.map((p) => {
                const st = STATUS_STYLES[p.status] || STATUS_STYLES.ACTIVE;
                const team = p.assigned_employees_detail || [];

                return (
                  <div key={p._id} className="ep-card">
                    <div className="ep-card-header">
                      <span className="ep-card-code">{p.code}</span>
                      <span
                        className="ep-card-status"
                        style={{
                          background: st.bg,
                          color: st.color,
                          borderColor: st.border,
                        }}
                      >
                        {st.label}
                      </span>
                    </div>

                    <div>
                      <div className="ep-card-name">{p.name}</div>
                      {p.client && (
                        <div className="ep-card-client">
                          Client: {p.client}
                        </div>
                      )}
                    </div>

                    {/* DATES GRID */}
                    <div className="ep-dates">
                      <div className="ep-date-cell">
                        <div className="ep-date-label">Start</div>
                        <div className="ep-date-value">
                          {formatDate(p.start_date)}
                        </div>
                      </div>
                      <div className="ep-date-cell">
                        <div className="ep-date-label">End</div>
                        <div className="ep-date-value">
                          {formatDate(p.end_date)}
                        </div>
                      </div>
                    </div>

                    {/* PROGRESS */}
                    <div className="ep-progress-row">
                      <div className="ep-progress-bar">
                        <div
                          className="ep-progress-fill"
                          style={{ width: `${p.progress || 0}%` }}
                        />
                      </div>
                      <span className="ep-progress-pct">
                        {p.progress || 0}%
                      </span>
                    </div>

                    {/* TEAM */}
                    <div className="ep-team">
                      <div className="ep-team-stack">
                        {team.slice(0, 4).map((e) => (
                          <div
                            key={e.id}
                            className="ep-avatar"
                            title={e.name}
                          >
                            {e.name
                              ?.split(" ")
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join("")}
                          </div>
                        ))}
                        {team.length > 4 && (
                          <div className="ep-avatar more">
                            +{team.length - 4}
                          </div>
                        )}
                      </div>
                      <span className="ep-team-count">
                        {team.length} member
                        {team.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </div>
    </Layout>
  );
};

export default EmployeeProjects;