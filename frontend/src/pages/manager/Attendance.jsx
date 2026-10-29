import { useState, useEffect, useCallback } from "react";
import {
  Calendar as CalendarIcon,
  Search,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  Activity,
  Building2,
  AlertTriangle,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Layout from "../../components/layout/Layout";
import Modal from "../../components/common/Modal";
import * as api from "../../api/attendanceApi";
import * as deptApi from "../../api/departmentApi";

const FONT = "'Inter', 'Segoe UI', -apple-system, sans-serif";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const formatHours = (hours) => {
  if (!hours || hours <= 0) return "—";
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
};

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

const formatDateLong = (isoDate) => {
  if (!isoDate) return "—";
  try {
    return new Date(isoDate).toLocaleDateString("en-IN", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return isoDate;
  }
};

const formatDateShort = (iso) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      weekday: "short",
      day: "2-digit",
      month: "short",
    });
  } catch {
    return iso;
  }
};

const StatCard = ({ label, value, icon: Icon, color, bg }) => (
  <div className="col-6 col-md-3">
    <div className="erp-card erp-stat-card">
      <div>
        <p className="erp-stat-label">{label}</p>
        <p className="erp-stat-value">{value}</p>
      </div>
      <div className="erp-stat-icon" style={{ backgroundColor: bg, color }}>
        <Icon size={20} />
      </div>
    </div>
  </div>
);

// ============================================
// Employee Monthly Report Modal
// ============================================
const EmployeeReportModal = ({ open, onClose, employee }) => {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState({ records: [], summary: {} });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !employee) return;
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.getEmployeeMonthlyReport(
          employee.employee_id,
          year,
          month
        );
        setData(res.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [open, employee, year, month]);

  const prevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear(year - 1);
    } else setMonth(month - 1);
  };

  const nextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
    } else setMonth(month + 1);
  };

  const summary = data.summary || {};

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${employee?.employee_name} - Attendance Report`}
      footer={
        <button className="erp-btn erp-btn-outline" onClick={onClose}>
          Close
        </button>
      }
    >
      {employee && (
        <div style={{ fontFamily: FONT }}>
          {/* Employee Info */}
          <div
            style={{
              padding: 12,
              background: "#f9fafb",
              borderRadius: 8,
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div className="erp-avatar">
              {employee.employee_name
                ?.split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700 }}>
                {employee.employee_name}
              </div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>
                {employee.employee_code}
                {employee.department_name && ` · ${employee.department_name}`}
              </div>
            </div>
          </div>

          {/* Month Navigation */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
              padding: "8px 12px",
              background: "#eef2ff",
              borderRadius: 8,
            }}
          >
            <button
              className="erp-icon-btn"
              onClick={prevMonth}
              style={{ border: "none" }}
            >
              <ChevronLeft size={16} />
            </button>
            <div
              style={{
                fontWeight: 700,
                fontSize: 14,
                color: "#4338ca",
              }}
            >
              {MONTHS[month - 1]} {year}
            </div>
            <button
              className="erp-icon-btn"
              onClick={nextMonth}
              style={{ border: "none" }}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Summary Cards */}
          <div className="row g-2 mb-3">
            <div className="col-6 col-md">
              <div
                style={{
                  padding: 10,
                  background: "#ecfdf5",
                  borderRadius: 8,
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    color: "#6b7280",
                    fontWeight: 600,
                    textTransform: "uppercase",
                  }}
                >
                  Present
                </div>
                <div
                  style={{ fontSize: 20, fontWeight: 700, color: "#059669" }}
                >
                  {summary.present_days || 0}
                </div>
              </div>
            </div>
            <div className="col-6 col-md">
              <div
                style={{
                  padding: 10,
                  background: "#fef2f2",
                  borderRadius: 8,
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    color: "#6b7280",
                    fontWeight: 600,
                    textTransform: "uppercase",
                  }}
                >
                  Absent
                </div>
                <div
                  style={{ fontSize: 20, fontWeight: 700, color: "#dc2626" }}
                >
                  {summary.absent_days || 0}
                </div>
              </div>
            </div>
            <div className="col-6 col-md">
              <div
                style={{
                  padding: 10,
                  background: "#fef3c7",
                  borderRadius: 8,
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    color: "#6b7280",
                    fontWeight: 600,
                    textTransform: "uppercase",
                  }}
                >
                  Late
                </div>
                <div
                  style={{ fontSize: 20, fontWeight: 700, color: "#d97706" }}
                >
                  {summary.late_days || 0}
                </div>
              </div>
            </div>
            <div className="col-6 col-md">
              <div
                style={{
                  padding: 10,
                  background: "#fef2f2",
                  borderRadius: 8,
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    color: "#6b7280",
                    fontWeight: 600,
                    textTransform: "uppercase",
                  }}
                >
                  Early
                </div>
                <div
                  style={{ fontSize: 20, fontWeight: 700, color: "#dc2626" }}
                >
                  {summary.early_logout_days || 0}
                </div>
              </div>
            </div>
            <div className="col-6 col-md">
              <div
                style={{
                  padding: 10,
                  background: "#eef2ff",
                  borderRadius: 8,
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    color: "#6b7280",
                    fontWeight: 600,
                    textTransform: "uppercase",
                  }}
                >
                  Hours
                </div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: "#4f46e5",
                    marginTop: 3,
                  }}
                >
                  {formatHours(summary.total_hours || 0)}
                </div>
              </div>
            </div>
          </div>

          {/* Records — Desktop table + Mobile cards */}
          <div
            style={{
              maxHeight: 350,
              overflowY: "auto",
              border: "1px solid var(--border)",
              borderRadius: 8,
            }}
          >
            {loading ? (
              <div
                className="text-center py-4"
                style={{ color: "#6b7280" }}
              >
                <div className="spinner-border spinner-border-sm me-2" />
                Loading...
              </div>
            ) : data.records.length === 0 ? (
              <div
                className="text-center py-4"
                style={{ color: "#6b7280" }}
              >
                <CalendarIcon
                  size={32}
                  style={{
                    display: "block",
                    margin: "0 auto 8px",
                    opacity: 0.4,
                  }}
                />
                No records this month
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="d-none d-md-block">
                  <table className="erp-table" style={{ fontSize: 12.5 }}>
                    <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
                      <tr>
                        <th style={{ padding: "8px 10px" }}>Date</th>
                        <th style={{ padding: "8px 10px" }}>In</th>
                        <th style={{ padding: "8px 10px" }}>Out</th>
                        <th style={{ padding: "8px 10px" }}>Hours</th>
                        <th style={{ padding: "8px 10px" }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.records.map((r) => (
                        <tr key={r._id}>
                          <td style={{ padding: "8px 10px", fontSize: 12 }}>
                            {formatDateShort(r.date)}
                          </td>
                          <td style={{ padding: "8px 10px" }}>
                            <span
                              style={{
                                color: r.is_late ? "#dc2626" : "#059669",
                                fontWeight: 600,
                                fontVariantNumeric: "tabular-nums",
                              }}
                            >
                              {formatTime(r.check_in)}
                            </span>
                            {r.is_late && (
                              <div
                                style={{ fontSize: 10, color: "#dc2626" }}
                              >
                                Late {formatMinutes(r.late_minutes)}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: "8px 10px" }}>
                            <span
                              style={{
                                color: r.is_early_logout
                                  ? "#dc2626"
                                  : "#d97706",
                                fontWeight: 600,
                                fontVariantNumeric: "tabular-nums",
                              }}
                            >
                              {formatTime(r.check_out)}
                            </span>
                            {r.is_early_logout && (
                              <div
                                style={{ fontSize: 10, color: "#dc2626" }}
                              >
                                Early {formatMinutes(r.early_minutes)}
                              </div>
                            )}
                          </td>
                          <td
                            style={{
                              padding: "8px 10px",
                              fontWeight: 600,
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            {formatHours(r.working_hours)}
                          </td>
                          <td style={{ padding: "8px 10px" }}>
                            {r.is_late && r.is_early_logout ? (
                              <span
                                className="erp-badge"
                                style={{
                                  background: "#fee2e2",
                                  color: "#991b1b",
                                  fontSize: 10,
                                }}
                              >
                                Late+Early
                              </span>
                            ) : r.is_late ? (
                              <span
                                className="erp-badge"
                                style={{
                                  background: "#fef3c7",
                                  color: "#92400e",
                                  fontSize: 10,
                                }}
                              >
                                Late
                              </span>
                            ) : r.is_early_logout ? (
                              <span
                                className="erp-badge"
                                style={{
                                  background: "#fef3c7",
                                  color: "#92400e",
                                  fontSize: 10,
                                }}
                              >
                                Early
                              </span>
                            ) : (
                              <span
                                className="erp-badge erp-badge-green"
                                style={{ fontSize: 10 }}
                              >
                                Present
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="d-md-none" style={{ padding: 10 }}>
                  {data.records.map((r) => (
                    <div
                      key={r._id}
                      style={{
                        padding: 12,
                        border: "1px solid #e2e8f0",
                        borderRadius: 10,
                        marginBottom: 10,
                        background: "white",
                        fontFamily: FONT,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 10,
                        }}
                      >
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: 13,
                            color: "#0f172a",
                          }}
                        >
                          {formatDateShort(r.date)}
                        </div>
                        {r.is_late && r.is_early_logout ? (
                          <span
                            className="erp-badge"
                            style={{
                              background: "#fee2e2",
                              color: "#991b1b",
                              fontSize: 10,
                            }}
                          >
                            Late+Early
                          </span>
                        ) : r.is_late ? (
                          <span
                            className="erp-badge"
                            style={{
                              background: "#fef3c7",
                              color: "#92400e",
                              fontSize: 10,
                            }}
                          >
                            Late
                          </span>
                        ) : r.is_early_logout ? (
                          <span
                            className="erp-badge"
                            style={{
                              background: "#fef3c7",
                              color: "#92400e",
                              fontSize: 10,
                            }}
                          >
                            Early
                          </span>
                        ) : (
                          <span
                            className="erp-badge erp-badge-green"
                            style={{ fontSize: 10 }}
                          >
                            Present
                          </span>
                        )}
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: "8px 12px",
                          fontSize: 12.5,
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontSize: 10,
                              color: "#94a3b8",
                              fontWeight: 700,
                              textTransform: "uppercase",
                              letterSpacing: 0.3,
                            }}
                          >
                            Check In
                          </div>
                          <div
                            style={{
                              fontWeight: 600,
                              marginTop: 2,
                              color: r.is_late ? "#dc2626" : "#059669",
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            {formatTime(r.check_in)}
                          </div>
                          {r.is_late && (
                            <div
                              style={{
                                fontSize: 10,
                                color: "#dc2626",
                                marginTop: 1,
                              }}
                            >
                              Late {formatMinutes(r.late_minutes)}
                            </div>
                          )}
                        </div>
                        <div>
                          <div
                            style={{
                              fontSize: 10,
                              color: "#94a3b8",
                              fontWeight: 700,
                              textTransform: "uppercase",
                              letterSpacing: 0.3,
                            }}
                          >
                            Check Out
                          </div>
                          <div
                            style={{
                              fontWeight: 600,
                              marginTop: 2,
                              color: r.is_early_logout
                                ? "#dc2626"
                                : "#d97706",
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            {formatTime(r.check_out)}
                          </div>
                          {r.is_early_logout && (
                            <div
                              style={{
                                fontSize: 10,
                                color: "#dc2626",
                                marginTop: 1,
                              }}
                            >
                              Early {formatMinutes(r.early_minutes)}
                            </div>
                          )}
                        </div>
                        <div>
                          <div
                            style={{
                              fontSize: 10,
                              color: "#94a3b8",
                              fontWeight: 700,
                              textTransform: "uppercase",
                              letterSpacing: 0.3,
                            }}
                          >
                            Hours
                          </div>
                          <div
                            style={{
                              fontWeight: 700,
                              marginTop: 2,
                              color: "#4f46e5",
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            {formatHours(r.working_hours)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
};

// ============================================
// Main Attendance Page
// ============================================
const Attendance = () => {
  const [data, setData] = useState({ records: [], summary: {} });
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [filterDept, setFilterDept] = useState("");
  const [search, setSearch] = useState("");
  const [reportEmployee, setReportEmployee] = useState(null);

  useEffect(() => {
    deptApi
      .listDepartments()
      .then((res) => setDepartments(res.data))
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getAllAttendance(selectedDate, filterDept, search);
      setData(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, filterDept, search]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const summary = data.summary || {};

  return (
    <Layout>
      <style>{`
        /* Global Inter font for this page */
        .att-page * { font-family: ${FONT}; }
        .att-page { font-family: ${FONT}; }

        /* Mobile mini card */
        .att-mobile-card {
          padding: 14px;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          background: #fff;
          margin-bottom: 10px;
          font-family: ${FONT};
          cursor: pointer;
          transition: box-shadow 0.15s, transform 0.15s;
        }
        .att-mobile-card:active {
          transform: scale(0.99);
          box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        }
        .att-mobile-head {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }
        .att-mobile-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px 12px;
          font-size: 12.5px;
        }
        .att-mobile-field-label {
          font-size: 10px;
          color: #94a3b8;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        .att-mobile-field-value {
          font-weight: 600;
          margin-top: 2px;
          font-variant-numeric: tabular-nums;
        }

        @media (max-width: 767px) {
          .att-page .erp-page-title { font-size: 22px; }
          .att-page .erp-page-subtitle { font-size: 12.5px; }
          .att-page .erp-stat-value { font-size: 20px; }
          .att-page .erp-stat-label { font-size: 10.5px; }
        }
      `}</style>

      <div className="att-page">
        <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
          <div>
            <h1 className="erp-page-title">Attendance</h1>
            <p className="erp-page-subtitle mb-0">
              View and manage employee attendance ·{" "}
              <span style={{ color: "#4f46e5", fontWeight: 600 }}>
                Tap any employee for full report
              </span>
            </p>
          </div>
        </div>

        <div className="erp-card mb-3" style={{ padding: 12 }}>
          <div className="row g-2 align-items-end">
            <div className="col-12 col-md-3">
              <label className="erp-label">Date</label>
              <input
                type="date"
                className="erp-input"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={new Date().toISOString().split("T")[0]}
              />
            </div>
            <div className="col-12 col-md-3">
              <label className="erp-label">Department</label>
              <select
                className="erp-input"
                value={filterDept}
                onChange={(e) => setFilterDept(e.target.value)}
              >
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-12 col-md-6">
              <label className="erp-label">Search Employee</label>
              <div className="erp-input-wrapper">
                <Search size={16} className="erp-input-icon" />
                <input
                  className="erp-input"
                  placeholder="Name or employee code..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 12,
            paddingLeft: 4,
          }}
        >
          <CalendarIcon size={16} color="#4f46e5" />
          <span style={{ fontSize: 13.5, fontWeight: 600 }}>
            {formatDateLong(selectedDate)}
          </span>
        </div>

        <div className="row g-3 mb-3">
          <StatCard
            label="Present"
            value={summary.present || 0}
            icon={CheckCircle2}
            color="#059669"
            bg="#ecfdf5"
          />
          <StatCard
            label="Working"
            value={summary.working || 0}
            icon={Activity}
            color="#4f46e5"
            bg="#eef2ff"
          />
          <StatCard
            label="Absent"
            value={summary.absent || 0}
            icon={XCircle}
            color="#dc2626"
            bg="#fef2f2"
          />
          <StatCard
            label="Total Hours"
            value={formatHours(summary.total_hours)}
            icon={Clock}
            color="#0891b2"
            bg="#ecfeff"
          />
        </div>

        {loading ? (
          <div
            className="erp-card text-center py-5"
            style={{ color: "#6b7280" }}
          >
            <div className="spinner-border spinner-border-sm me-2" />
            Loading attendance...
          </div>
        ) : data.records.length === 0 ? (
          <div className="erp-card text-center py-5">
            <Users size={42} color="#d1d5db" style={{ marginBottom: 12 }} />
            <h5 style={{ fontWeight: 600 }}>No records found</h5>
            <p style={{ color: "#6b7280", margin: 0 }}>
              No attendance data for this date
            </p>
          </div>
        ) : (
          <>
            {/* Desktop View — Table */}
            <div
              className="erp-card d-none d-lg-block"
              style={{ padding: 0, overflow: "hidden" }}
            >
              <div className="table-responsive">
                <table className="erp-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Department</th>
                      <th>Check In</th>
                      <th>Check Out</th>
                      <th>Working Hours</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.records.map((r) => (
                      <tr
                        key={r.employee_id}
                        onClick={() => setReportEmployee(r)}
                        style={{
                          cursor: "pointer",
                          opacity: r.status === "ABSENT" ? 0.65 : 1,
                        }}
                        title="Click for full report"
                      >
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <div
                              className="erp-avatar"
                              style={
                                r.status === "ABSENT"
                                  ? { background: "#9ca3af" }
                                  : {}
                              }
                            >
                              {r.employee_name
                                ?.split(" ")
                                .map((n) => n[0])
                                .slice(0, 2)
                                .join("")}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600 }}>
                                {r.employee_name}
                              </div>
                              <div
                                style={{ fontSize: 12, color: "#6b7280" }}
                              >
                                {r.employee_code}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          {r.department_name ? (
                            <span className="erp-badge erp-badge-blue">
                              <Building2 size={11} />
                              {r.department_name}
                            </span>
                          ) : (
                            <span style={{ color: "#9ca3af" }}>—</span>
                          )}
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
                          {r.check_in && r.is_late && (
                            <div
                              style={{
                                fontSize: 10.5,
                                color: "#dc2626",
                                fontWeight: 600,
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
                          {r.check_out && r.is_early_logout && (
                            <div
                              style={{
                                fontSize: 10.5,
                                color: "#dc2626",
                                fontWeight: 600,
                              }}
                            >
                              ? Early {formatMinutes(r.early_minutes)}
                            </div>
                          )}
                        </td>
                        <td
                          style={{
                            fontVariantNumeric: "tabular-nums",
                            fontWeight: 600,
                          }}
                        >
                          {formatHours(r.working_hours)}
                        </td>
                        <td>
                          {r.status === "PRESENT" && (
                            <span className="erp-badge erp-badge-green">
                              ? Present
                            </span>
                          )}
                          {r.status === "WORKING" && (
                            <span className="erp-badge erp-badge-blue">
                              ? Working
                            </span>
                          )}
                          {r.status === "ABSENT" && (
                            <span className="erp-badge erp-badge-gray">
                              ? Absent
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile + Tablet — Cards */}
            <div className="d-lg-none">
              {data.records.map((r) => (
                <div
                  key={r.employee_id}
                  className="att-mobile-card"
                  onClick={() => setReportEmployee(r)}
                  style={{
                    opacity: r.status === "ABSENT" ? 0.7 : 1,
                  }}
                >
                  <div className="att-mobile-head">
                    <div
                      className="erp-avatar"
                      style={{
                        flexShrink: 0,
                        ...(r.status === "ABSENT"
                          ? { background: "#9ca3af" }
                          : {}),
                      }}
                    >
                      {r.employee_name
                        ?.split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: 14.5,
                          marginBottom: 2,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {r.employee_name}
                      </div>
                      <div
                        style={{
                          fontSize: 11.5,
                          color: "#6b7280",
                          display: "flex",
                          gap: 6,
                          alignItems: "center",
                          flexWrap: "wrap",
                        }}
                      >
                        <span>{r.employee_code}</span>
                        {r.department_name && (
                          <>
                            <span style={{ color: "#cbd5e1" }}>·</span>
                            <span>{r.department_name}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div style={{ flexShrink: 0 }}>
                      {r.status === "PRESENT" && (
                        <span className="erp-badge erp-badge-green">
                          ? Present
                        </span>
                      )}
                      {r.status === "WORKING" && (
                        <span className="erp-badge erp-badge-blue">
                          ? Working
                        </span>
                      )}
                      {r.status === "ABSENT" && (
                        <span className="erp-badge erp-badge-gray">
                          ? Absent
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="att-mobile-grid">
                    <div>
                      <div className="att-mobile-field-label">Check In</div>
                      <div
                        className="att-mobile-field-value"
                        style={{
                          color: r.check_in
                            ? r.is_late
                              ? "#dc2626"
                              : "#059669"
                            : "#9ca3af",
                        }}
                      >
                        {formatTime(r.check_in)}
                      </div>
                      {r.check_in && r.is_late && (
                        <div
                          style={{
                            fontSize: 10,
                            color: "#dc2626",
                            fontWeight: 600,
                            marginTop: 1,
                          }}
                        >
                          ? Late {formatMinutes(r.late_minutes)}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="att-mobile-field-label">Check Out</div>
                      <div
                        className="att-mobile-field-value"
                        style={{
                          color: r.check_out
                            ? r.is_early_logout
                              ? "#dc2626"
                              : "#d97706"
                            : "#9ca3af",
                        }}
                      >
                        {formatTime(r.check_out)}
                      </div>
                      {r.check_out && r.is_early_logout && (
                        <div
                          style={{
                            fontSize: 10,
                            color: "#dc2626",
                            fontWeight: 600,
                            marginTop: 1,
                          }}
                        >
                          ? Early {formatMinutes(r.early_minutes)}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="att-mobile-field-label">
                        Working Hours
                      </div>
                      <div
                        className="att-mobile-field-value"
                        style={{ color: "#4f46e5" }}
                      >
                        {formatHours(r.working_hours)}
                      </div>
                    </div>
                    <div>
                      <div className="att-mobile-field-label">
                        Department
                      </div>
                      <div className="att-mobile-field-value">
                        {r.department_name || "—"}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Employee Report Modal */}
        <EmployeeReportModal
          open={!!reportEmployee}
          onClose={() => setReportEmployee(null)}
          employee={reportEmployee}
        />
      </div>
    </Layout>
  );
};

export default Attendance;