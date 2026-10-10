import { useState, useEffect } from "react";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  MapPin,
} from "lucide-react";
import Layout from "../../components/layout/Layout";
import Toast from "../../components/common/Toast";
import * as holidayApi from "../../api/holidayApi";

const FONT = "'Inter', 'Segoe UI', -apple-system, sans-serif";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Subtle type badges — no bright colors, just muted tones
const TYPE_BADGE = {
  National: { bg: "#f4f4f5", color: "#18181b", border: "#e4e4e7" },
  Regional: { bg: "#fef9f3", color: "#78350f", border: "#fde68a" },
  Festival: { bg: "#faf5ff", color: "#581c87", border: "#e9d5ff" },
  Company: { bg: "#eff6ff", color: "#1e3a8a", border: "#bfdbfe" },
  Optional: { bg: "#f0fdf4", color: "#14532d", border: "#bbf7d0" },
};

const formatDate = (d) => {
  if (!d) return "—";
  const dt = new Date(d);
  return dt.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const EmployeeHolidays = () => {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [toast, setToast] = useState(null);

  useEffect(() => {
    setLoading(true);
    holidayApi
      .listHolidays(year)
      .then((res) => setHolidays(Array.isArray(res.data) ? res.data : []))
      .catch(() => setToast({ message: "Failed to load", type: "error" }))
      .finally(() => setLoading(false));
  }, [year]);

  const byMonth = {};
  holidays.forEach((h) => {
    const d = new Date(h.date);
    const m = d.getMonth();
    if (!byMonth[m]) byMonth[m] = [];
    byMonth[m].push(h);
  });

  const totalHolidays = holidays.length;
  const nationalCount = holidays.filter((h) => h.type === "National").length;
  const festivalCount = holidays.filter((h) => h.type === "Festival").length;
  const optionalCount = holidays.filter((h) => h.is_optional).length;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcoming = holidays
    .filter((h) => new Date(h.date) >= today)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const nextHoliday = upcoming[0];
  const daysUntilNext = nextHoliday
    ? Math.ceil(
        (new Date(nextHoliday.date) - new Date()) / (1000 * 60 * 60 * 24)
      )
    : null;

  return (
    <Layout>
      <style>{`
        .hol-page * { font-family: ${FONT}; }
        .hol-page {
          font-family: ${FONT};
          max-width: 1100px;
          margin: 0 auto;
          color: #18181b;
          padding-bottom: 60px;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        /* ============ PAGE HEADER ============ */
        .hol-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 32px;
          flex-wrap: wrap;
          gap: 16px;
        }
        .hol-title {
          font-size: 32px;
          font-weight: 700;
          color: #09090b;
          letter-spacing: -1px;
          margin-bottom: 6px;
          line-height: 1.1;
        }
        .hol-subtitle {
          font-size: 14px;
          color: #71717a;
          margin: 0;
          font-weight: 400;
        }

        /* Year picker — minimal */
        .hol-year-picker {
          display: inline-flex;
          align-items: center;
          gap: 2px;
          background: white;
          border: 1px solid #e4e4e7;
          border-radius: 10px;
          padding: 3px;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
        }
        .hol-year-btn {
          width: 32px;
          height: 32px;
          border-radius: 7px;
          border: none;
          background: transparent;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #52525b;
          transition: all 0.15s;
        }
        .hol-year-btn:hover {
          background: #f4f4f5;
          color: #09090b;
        }
        .hol-year-value {
          padding: 0 14px;
          font-weight: 600;
          font-size: 14px;
          color: #09090b;
          letter-spacing: -0.2px;
          font-variant-numeric: tabular-nums;
        }

        /* ============ STATS ============ */
        .hol-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1px;
          background: #e4e4e7;
          border: 1px solid #e4e4e7;
          border-radius: 12px;
          overflow: hidden;
          margin-bottom: 32px;
        }
        .hol-stat {
          background: white;
          padding: 20px 22px;
          transition: background 0.15s;
        }
        .hol-stat:hover {
          background: #fafafa;
        }
        .hol-stat-label {
          font-size: 11px;
          font-weight: 500;
          color: #71717a;
          text-transform: uppercase;
          letter-spacing: 0.6px;
          margin-bottom: 8px;
        }
        .hol-stat-value {
          font-size: 26px;
          font-weight: 700;
          color: #09090b;
          line-height: 1;
          letter-spacing: -0.8px;
          font-variant-numeric: tabular-nums;
        }
        .hol-stat-value.muted {
          color: #a1a1aa;
          font-weight: 600;
        }

        /* ============ NEXT HOLIDAY HERO ============ */
        .hol-hero {
          background: #09090b;
          color: white;
          border-radius: 16px;
          padding: 28px 32px;
          margin-bottom: 32px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          flex-wrap: wrap;
          position: relative;
          overflow: hidden;
        }
        .hol-hero::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-image:
            radial-gradient(circle at 20% 30%, rgba(255, 255, 255, 0.04) 0%, transparent 50%),
            radial-gradient(circle at 80% 70%, rgba(255, 255, 255, 0.03) 0%, transparent 50%);
          pointer-events: none;
        }
        .hol-hero-left {
          position: relative;
          z-index: 1;
          flex: 1;
          min-width: 220px;
        }
        .hol-hero-label {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 500;
          color: #a1a1aa;
          background: rgba(255, 255, 255, 0.08);
          padding: 4px 10px;
          border-radius: 6px;
          text-transform: uppercase;
          letter-spacing: 0.6px;
          margin-bottom: 14px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .hol-hero-name {
          font-size: 30px;
          font-weight: 700;
          color: white;
          letter-spacing: -0.8px;
          line-height: 1.1;
          margin-bottom: 10px;
        }
        .hol-hero-date {
          font-size: 13.5px;
          color: #a1a1aa;
          font-weight: 400;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .hol-hero-right {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
        }
        .hol-hero-countdown {
          text-align: right;
          padding-right: 20px;
          border-right: 1px solid rgba(255, 255, 255, 0.1);
        }
        .hol-hero-countdown-num {
          font-size: 36px;
          font-weight: 800;
          color: white;
          line-height: 1;
          letter-spacing: -1.5px;
          font-variant-numeric: tabular-nums;
        }
        .hol-hero-countdown-label {
          font-size: 10.5px;
          font-weight: 500;
          color: #a1a1aa;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          margin-top: 6px;
        }
        .hol-hero-icon {
          width: 56px;
          height: 56px;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.12);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          flex-shrink: 0;
        }

        /* ============ COMING UP ============ */
        .hol-upcoming {
          margin-bottom: 32px;
        }
        .hol-section-title {
          font-size: 11.5px;
          font-weight: 600;
          color: #71717a;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          margin-bottom: 14px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .hol-section-title::after {
          content: "";
          flex: 1;
          height: 1px;
          background: #f4f4f5;
        }
        .hol-upcoming-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 10px;
        }
        .hol-upcoming-card {
          background: white;
          border: 1px solid #e4e4e7;
          border-radius: 10px;
          padding: 14px;
          display: flex;
          align-items: center;
          gap: 12px;
          transition: all 0.15s ease;
        }
        .hol-upcoming-card:hover {
          border-color: #a1a1aa;
          box-shadow: 0 2px 8px -2px rgba(0, 0, 0, 0.06);
        }
        .hol-upcoming-date {
          width: 42px;
          height: 42px;
          border-radius: 10px;
          background: #f4f4f5;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .hol-upcoming-day {
          font-size: 15px;
          font-weight: 700;
          color: #18181b;
          line-height: 1;
          font-variant-numeric: tabular-nums;
        }
        .hol-upcoming-mon {
          font-size: 8.5px;
          font-weight: 600;
          color: #71717a;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-top: 2px;
        }
        .hol-upcoming-info { min-width: 0; flex: 1; }
        .hol-upcoming-name {
          font-size: 13px;
          font-weight: 600;
          color: #09090b;
          line-height: 1.3;
          margin-bottom: 2px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .hol-upcoming-day-name {
          font-size: 11px;
          color: #a1a1aa;
          font-weight: 400;
        }

        /* ============ MONTH SECTIONS ============ */
        .hol-month {
          margin-bottom: 28px;
        }
        .hol-month-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 14px;
        }
        .hol-month-name {
          font-size: 13px;
          font-weight: 600;
          color: #09090b;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .hol-month-count {
          font-size: 11px;
          font-weight: 500;
          color: #a1a1aa;
          background: #f4f4f5;
          padding: 2px 8px;
          border-radius: 5px;
          font-variant-numeric: tabular-nums;
        }
        .hol-month-line {
          flex: 1;
          height: 1px;
          background: #f4f4f5;
        }

        /* ============ HOLIDAY ITEM ============ */
        .hol-item {
          background: white;
          border: 1px solid #e4e4e7;
          border-radius: 12px;
          padding: 16px 18px;
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 16px;
          transition: all 0.15s ease;
        }
        .hol-item:hover {
          border-color: #a1a1aa;
          box-shadow: 0 2px 8px -2px rgba(0, 0, 0, 0.06);
        }
        .hol-item-date {
          width: 52px;
          height: 52px;
          border-radius: 12px;
          background: #fafafa;
          border: 1px solid #e4e4e7;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .hol-item-day {
          font-size: 19px;
          font-weight: 700;
          color: #09090b;
          line-height: 1;
          letter-spacing: -0.5px;
          font-variant-numeric: tabular-nums;
        }
        .hol-item-mon {
          font-size: 8.5px;
          font-weight: 600;
          color: #71717a;
          text-transform: uppercase;
          letter-spacing: 0.6px;
          margin-top: 3px;
        }
        .hol-item-info { flex: 1; min-width: 0; }
        .hol-item-name-row {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 3px;
        }
        .hol-item-name {
          font-size: 14.5px;
          font-weight: 600;
          color: #09090b;
          letter-spacing: -0.2px;
        }
        .hol-item-optional {
          font-size: 9.5px;
          font-weight: 600;
          background: #f4f4f5;
          color: #52525b;
          padding: 2px 6px;
          border-radius: 4px;
          letter-spacing: 0.4px;
          text-transform: uppercase;
        }
        .hol-item-desc {
          font-size: 12.5px;
          color: #a1a1aa;
          font-weight: 400;
        }

        .hol-item-badge {
          display: inline-flex;
          align-items: center;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 10.5px;
          font-weight: 600;
          flex-shrink: 0;
          letter-spacing: 0.3px;
          text-transform: uppercase;
          border: 1px solid transparent;
        }

        /* ============ EMPTY ============ */
        .hol-empty {
          background: white;
          border: 1px solid #e4e4e7;
          border-radius: 16px;
          padding: 80px 24px;
          text-align: center;
        }
        .hol-empty-icon {
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
        .hol-empty-title {
          font-size: 15px;
          font-weight: 600;
          color: #09090b;
          margin-bottom: 6px;
        }
        .hol-empty-desc {
          font-size: 13px;
          color: #71717a;
          font-weight: 400;
        }

        .hol-loading {
          background: white;
          border: 1px solid #e4e4e7;
          border-radius: 12px;
          padding: 80px;
          text-align: center;
          color: #a1a1aa;
          font-size: 13px;
          font-weight: 500;
        }

        /* ============ MOBILE ============ */
        @media (max-width: 900px) {
          .hol-stats { grid-template-columns: repeat(2, 1fr); }
        }

        @media (max-width: 767px) {
          .hol-page { padding: 0 4px; }
          .hol-title { font-size: 24px; }
          .hol-subtitle { font-size: 13px; }
          .hol-header { margin-bottom: 20px; }
          .hol-year-picker { width: 100%; justify-content: space-between; }

          .hol-stats { margin-bottom: 20px; border-radius: 10px; }
          .hol-stat { padding: 14px 16px; }
          .hol-stat-value { font-size: 22px; }
          .hol-stat-label { font-size: 10px; margin-bottom: 5px; }

          .hol-hero {
            padding: 20px;
            border-radius: 14px;
            margin-bottom: 22px;
          }
          .hol-hero-name { font-size: 22px; }
          .hol-hero-date { font-size: 12px; }
          .hol-hero-countdown-num { font-size: 28px; }
          .hol-hero-countdown-label { font-size: 9.5px; }
          .hol-hero-icon { width: 48px; height: 48px; border-radius: 12px; }
          .hol-hero-right { width: 100%; justify-content: space-between; }

          .hol-upcoming-grid { grid-template-columns: 1fr; }
          .hol-upcoming { margin-bottom: 22px; }

          .hol-month { margin-bottom: 20px; }
          .hol-month-name { font-size: 12px; }

          .hol-item {
            padding: 14px;
            gap: 12px;
            border-radius: 10px;
            flex-wrap: wrap;
          }
          .hol-item-date { width: 46px; height: 46px; border-radius: 10px; }
          .hol-item-day { font-size: 17px; }
          .hol-item-mon { font-size: 8px; }
          .hol-item-name { font-size: 13.5px; }
          .hol-item-badge {
            order: 3;
            margin-left: 58px;
            font-size: 10px;
          }
        }

        @media (max-width: 400px) {
          .hol-item-badge { margin-left: 0; order: 0; }
        }
      `}</style>

      <div className="hol-page">
        {/* ============ HEADER ============ */}
        <div className="hol-header">
          <div>
            <h1 className="hol-title">Holiday Calendar</h1>
            <p className="hol-subtitle">
              Company holidays for {year}
            </p>
          </div>

          <div className="hol-year-picker">
            <button
              className="hol-year-btn"
              onClick={() => setYear(year - 1)}
              title="Previous year"
            >
              <ChevronLeft size={16} strokeWidth={2.2} />
            </button>
            <span className="hol-year-value">{year}</span>
            <button
              className="hol-year-btn"
              onClick={() => setYear(year + 1)}
              title="Next year"
            >
              <ChevronRight size={16} strokeWidth={2.2} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="hol-loading">
            <div className="spinner-border spinner-border-sm me-2" />
            Loading holidays...
          </div>
        ) : holidays.length === 0 ? (
          <div className="hol-empty">
            <div className="hol-empty-icon">
              <Calendar size={28} strokeWidth={1.8} />
            </div>
            <div className="hol-empty-title">No holidays for {year}</div>
            <div className="hol-empty-desc">
              Manager intha year ku holidays add pannala
            </div>
          </div>
        ) : (
          <>
            {/* ============ STATS ============ */}
            <div className="hol-stats">
              <div className="hol-stat">
                <div className="hol-stat-label">Total</div>
                <div className="hol-stat-value">{totalHolidays}</div>
              </div>
              <div className="hol-stat">
                <div className="hol-stat-label">National</div>
                <div className="hol-stat-value">{nationalCount}</div>
              </div>
              <div className="hol-stat">
                <div className="hol-stat-label">Festivals</div>
                <div className="hol-stat-value">{festivalCount}</div>
              </div>
              <div className="hol-stat">
                <div className="hol-stat-label">Optional</div>
                <div
                  className={`hol-stat-value ${
                    optionalCount === 0 ? "muted" : ""
                  }`}
                >
                  {optionalCount}
                </div>
              </div>
            </div>

            {/* ============ NEXT HOLIDAY HERO ============ */}
            {nextHoliday && (
              <div className="hol-hero">
                <div className="hol-hero-left">
                  <div className="hol-hero-label">
                    <Sparkles size={11} strokeWidth={2.5} />
                    Next Holiday
                  </div>
                  <div className="hol-hero-name">{nextHoliday.name}</div>
                  <div className="hol-hero-date">
                    <Calendar size={14} strokeWidth={2} />
                    {formatDate(nextHoliday.date)}
                  </div>
                </div>

                <div className="hol-hero-right">
                  <div className="hol-hero-countdown">
                    <div className="hol-hero-countdown-num">
                      {daysUntilNext}
                    </div>
                    <div className="hol-hero-countdown-label">
                      {daysUntilNext === 1 ? "Day" : "Days"} Left
                    </div>
                  </div>
                  <div className="hol-hero-icon">
                    <Sparkles size={26} strokeWidth={1.8} />
                  </div>
                </div>
              </div>
            )}

            {/* ============ COMING UP ============ */}
            {upcoming.length > 1 && (
              <div className="hol-upcoming">
                <div className="hol-section-title">Coming Up</div>
                <div className="hol-upcoming-grid">
                  {upcoming.slice(1, 5).map((h) => {
                    const d = new Date(h.date);
                    return (
                      <div key={h._id} className="hol-upcoming-card">
                        <div className="hol-upcoming-date">
                          <div className="hol-upcoming-day">
                            {d.getDate()}
                          </div>
                          <div className="hol-upcoming-mon">
                            {MONTHS[d.getMonth()].slice(0, 3)}
                          </div>
                        </div>
                        <div className="hol-upcoming-info">
                          <div className="hol-upcoming-name">
                            {h.name}
                          </div>
                          <div className="hol-upcoming-day-name">
                            {d.toLocaleDateString("en-IN", {
                              weekday: "long",
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ============ MONTH SECTIONS ============ */}
            {Object.entries(byMonth)
              .sort(([a], [b]) => parseInt(a) - parseInt(b))
              .map(([monthIdx, items]) => (
                <div key={monthIdx} className="hol-month">
                  <div className="hol-month-header">
                    <span className="hol-month-name">
                      {MONTHS[parseInt(monthIdx)]}
                    </span>
                    <span className="hol-month-count">{items.length}</span>
                    <div className="hol-month-line" />
                  </div>

                  {items.map((h) => {
                    const d = new Date(h.date);
                    const badge =
                      TYPE_BADGE[h.type] || TYPE_BADGE.Optional;
                    return (
                      <div key={h._id} className="hol-item">
                        <div className="hol-item-date">
                          <div className="hol-item-day">
                            {d.getDate()}
                          </div>
                          <div className="hol-item-mon">
                            {MONTHS[d.getMonth()].slice(0, 3)}
                          </div>
                        </div>

                        <div className="hol-item-info">
                          <div className="hol-item-name-row">
                            <span className="hol-item-name">{h.name}</span>
                            {h.is_optional && (
                              <span className="hol-item-optional">
                                Optional
                              </span>
                            )}
                          </div>
                          <div className="hol-item-desc">
                            {h.description ||
                              d.toLocaleDateString("en-IN", {
                                weekday: "long",
                              })}
                          </div>
                        </div>

                        <span
                          className="hol-item-badge"
                          style={{
                            background: badge.bg,
                            color: badge.color,
                            borderColor: badge.border,
                          }}
                        >
                          {h.type}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
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

export default EmployeeHolidays;