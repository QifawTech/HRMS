import { useState, useEffect, useCallback } from "react";
import {
  CalendarDays,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Clock,
} from "lucide-react";
import Layout from "../../components/layout/Layout";
import * as api from "../../api/attendanceApi";

// ============================================
// Helpers
// ============================================

const formatHours = (hours) => {
  if (!hours || hours <= 0) return "0h 0m";
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
};

// ? NEW: Format minutes ? "1h 9m" or "45m"
const formatMinutes = (mins) => {
  if (!mins || mins <= 0) return "0m";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
};

const formatTime = (iso) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "—";
  }
};

const formatDateParts = (iso) => {
  if (!iso) return { day: "—", rest: "" };
  try {
    const d = new Date(iso);
    const weekday = d.toLocaleDateString("en-IN", { weekday: "short" });
    const day = d.toLocaleDateString("en-IN", { day: "2-digit" });
    const month = d.toLocaleDateString("en-IN", { month: "short" });
    const year = d.toLocaleDateString("en-IN", { year: "numeric" });
    return { day: `${weekday}, ${day}`, rest: `${month} ${year}` };
  } catch {
    return { day: iso, rest: "" };
  }
};

// ============================================
// Status Badge
// ============================================

const StatusBadge = ({ record }) => {
  if (record.is_late && record.is_early_logout) {
    return (
      <span
        className="erp-badge"
        style={{ background: "#fee2e2", color: "#991b1b" }}
      >
        <AlertTriangle size={11} /> Late + Early
      </span>
    );
  }
  if (record.is_late) {
    return (
      <span
        className="erp-badge"
        style={{ background: "#fef3c7", color: "#92400e" }}
      >
        <AlertTriangle size={11} /> Late
      </span>
    );
  }
  if (record.is_early_logout) {
    return (
      <span
        className="erp-badge"
        style={{ background: "#fef3c7", color: "#92400e" }}
      >
        <AlertTriangle size={11} /> Early Logout
      </span>
    );
  }
  if (record.status === "PRESENT") {
    return (
      <span className="erp-badge erp-badge-green">
        <CheckCircle2 size={11} /> Present
      </span>
    );
  }
  if (record.status === "HALF_DAY") {
    return (
      <span
        className="erp-badge"
        style={{ background: "#fef3c7", color: "#92400e" }}
      >
        Half Day
      </span>
    );
  }
  return (
    <span className="erp-badge erp-badge-gray">
      <XCircle size={11} /> {record.status}
    </span>
  );
};

// ============================================
// Stat Card
// ============================================

const StatCard = ({ label, value, sub, Icon, color, bg }) => (
  <div className="col-6 col-md-3">
    <div className="erp-card erp-stat-card">
      <div style={{ minWidth: 0, flex: 1 }}>
        <p className="erp-stat-label">{label}</p>
        <p className="erp-stat-value">{value}</p>
        {sub && (
          <small
            style={{
              color: "#6b7280",
              fontSize: 11,
              display: "block",
              marginTop: 2,
            }}
          >
            {sub}
          </small>
        )}
      </div>
      <div className="erp-stat-icon" style={{ backgroundColor: bg, color }}>
        <Icon size={20} />
      </div>
    </div>
  </div>
);

// ============================================
// Constants
// ============================================

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const now = new Date();

// ============================================
// Main Component
// ============================================

const EmployeeAttendance = () => {
  const [data, setData] = useState({ records: [], summary: {} });
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getMyMonthlyReport(year, month);
      setData(res.data);
    } catch (e) {
      console.error("Failed to load attendance:", e);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    load();
  }, [load]);

  const prevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };

  const nextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  const canGoNext = () => {
    const today = new Date();
    return (
      year < today.getFullYear() ||
      (year === today.getFullYear() && month < today.getMonth() + 1)
    );
  };

  const canGoPrev = () => {
    const today = new Date();
    const diff =
      (today.getFullYear() - year) * 12 + (today.getMonth() + 1 - month);
    return diff < 24;
  };

  const summary = data.summary || {};
  const records = data.records || [];

  return (
    <Layout>
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
        <div>
          <h1 className="erp-page-title">My Attendance</h1>
          <p className="erp-page-subtitle mb-0">
            Your monthly attendance report
          </p>
        </div>
      </div>

      {/* Month Selector */}
      <div className="erp-card mb-3" style={{ padding: 12 }}>
        <div className="d-flex align-items-center justify-content-between">
          <button
            className="erp-icon-btn"
            onClick={prevMonth}
            disabled={!canGoPrev()}
            style={{ opacity: canGoPrev() ? 1 : 0.3 }}
            title="Previous Month"
          >
            <ChevronLeft size={16} />
          </button>

          <div
            style={{
              fontSize: 15,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <CalendarDays size={16} color="#4f46e5" />
            {MONTHS[month - 1]} {year}
          </div>

          <button
            className="erp-icon-btn"
            onClick={nextMonth}
            disabled={!canGoNext()}
            style={{ opacity: canGoNext() ? 1 : 0.3 }}
            title="Next Month"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="row g-3 mb-3">
        <StatCard
          label="Present"
          value={summary.present_days || 0}
          sub={`of ${summary.weekdays_in_month || 0} working days`}
          Icon={CheckCircle2}
          color="#059669"
          bg="#ecfdf5"
        />
        <StatCard
          label="Late Days"
          value={summary.late_days || 0}
          sub={
            summary.late_days > 0
              ? "Need improvement"
              : "All on time ?"
          }
          Icon={AlertTriangle}
          color="#d97706"
          bg="#fef3c7"
        />
        <StatCard
          label="Early Logout"
          value={summary.early_logout_days || 0}
          sub="Before 5:30 PM"
          Icon={XCircle}
          color="#dc2626"
          bg="#fef2f2"
        />
        <StatCard
          label="Total Hours"
          value={formatHours(summary.total_hours || 0)}
          sub={`${summary.present_days || 0} days worked`}
          Icon={TrendingUp}
          color="#4f46e5"
          bg="#eef2ff"
        />
      </div>

      {/* Absent Info (if any) */}
      {summary.absent_days > 0 && (
        <div
          className="erp-card mb-3"
          style={{
            padding: 10,
            background: "#fef2f2",
            border: "1px solid #fecaca",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <XCircle size={16} color="#dc2626" />
          <span style={{ fontSize: 13, color: "#991b1b" }}>
            <strong>{summary.absent_days}</strong> absent day
            {summary.absent_days > 1 ? "s" : ""} this month
          </span>
        </div>
      )}

      {/* Records Table */}
      {loading ? (
        <div className="erp-card text-center py-5" style={{ color: "#6b7280" }}>
          <div className="spinner-border spinner-border-sm me-2" />
          Loading attendance...
        </div>
      ) : records.length === 0 ? (
        <div className="erp-card text-center py-5">
          <CalendarDays size={42} color="#d1d5db" style={{ marginBottom: 12 }} />
          <h5 style={{ fontWeight: 600 }}>No records this month</h5>
          <p style={{ color: "#6b7280", margin: 0 }}>
            You haven't checked in this month yet
          </p>
        </div>
      ) : (
        <div className="erp-card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="table-responsive">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                  <th>Working Hours</th>
                  <th>Status</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => {
                  const dateParts = formatDateParts(r.date);
                  return (
                    <tr key={r._id}>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>
                          {dateParts.day}
                        </div>
                        <div style={{ fontSize: 11.5, color: "#6b7280" }}>
                          {dateParts.rest}
                        </div>
                      </td>
                      <td>
                        <div
                          style={{
                            fontVariantNumeric: "tabular-nums",
                            fontWeight: 600,
                            color: r.check_in
                              ? r.is_late
                                ? "#dc2626"
                                : "#059669"
                              : "#9ca3af",
                          }}
                        >
                          {formatTime(r.check_in)}
                        </div>
                        {r.is_late && (
                          <div
                            style={{
                              fontSize: 10.5,
                              color: "#dc2626",
                              fontWeight: 600,
                              marginTop: 2,
                            }}
                          >
                            ? Late {formatMinutes(r.late_minutes)}
                          </div>
                        )}
                      </td>
                      <td>
                        <div
                          style={{
                            fontVariantNumeric: "tabular-nums",
                            fontWeight: 600,
                            color: r.check_out
                              ? r.is_early_logout
                                ? "#dc2626"
                                : "#d97706"
                              : "#9ca3af",
                          }}
                        >
                          {formatTime(r.check_out)}
                        </div>
                        {r.is_early_logout && (
                          <div
                            style={{
                              fontSize: 10.5,
                              color: "#dc2626",
                              fontWeight: 600,
                              marginTop: 2,
                            }}
                          >
                            ? Early {formatMinutes(r.early_minutes)}
                          </div>
                        )}
                      </td>
                      <td>
                        <div
                          style={{
                            fontVariantNumeric: "tabular-nums",
                            fontWeight: 600,
                          }}
                        >
                          {formatHours(r.working_hours)}
                        </div>
                      </td>
                      <td>
                        <StatusBadge record={r} />
                      </td>
                      <td>
                        {r.early_logout_reason ? (
                          <div
                            style={{
                              fontSize: 11.5,
                              color: "#6b7280",
                              fontStyle: "italic",
                              maxWidth: 200,
                            }}
                          >
                            "{r.early_logout_reason}"
                          </div>
                        ) : (
                          <span style={{ color: "#d1d5db" }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Footer Note */}
      {!loading && records.length > 0 && (
        <div
          style={{
            marginTop: 12,
            padding: "8px 12px",
            background: "#f9fafb",
            borderRadius: 8,
            fontSize: 12,
            color: "#6b7280",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Clock size={13} />
          <span>
            Standard hours: <strong>09:30 AM – 05:30 PM</strong> · Late /
            Early logouts are tracked
          </span>
        </div>
      )}
    </Layout>
  );
};

export default EmployeeAttendance;