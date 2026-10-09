import { useState, useEffect, useCallback } from "react";
import {
  Users,
  Clock,
  CalendarDays,
  Building2,
  Download,
  Printer,
  Search,
  FileText,
  PieChart as PieIcon,
  ArrowLeft,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Eye,
  Calendar,
  PartyPopper,
  Award,
  Target,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import Layout from "../../components/layout/Layout";
import Toast from "../../components/common/Toast";
import * as api from "../../api/reportApi";
import * as deptApi from "../../api/departmentApi";
import * as empApi from "../../api/employeeApi";
import EmployeeFullReport from "../../components/reports/EmployeeFullReport";

const FONT = "'Inter', 'Segoe UI', -apple-system, sans-serif";

const COLORS = [
  "#4f46e5",
  "#0891b2",
  "#059669",
  "#d97706",
  "#dc2626",
  "#7c3aed",
  "#db2777",
];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const currentMonthStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
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

const formatDate = (iso) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
};

const formatHours = (h) => {
  if (!h || h <= 0) return "0h";
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  if (hrs === 0) return `${mins}m`;
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
};

const exportCSV = (data, filename) => {
  if (!data || data.length === 0) return;

  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers
      .map((h) => {
        const v = row[h];
        const str = v == null ? "" : String(v);
        return `"${str.replace(/"/g, '""')}"`;
      })
      .join(",")
  );

  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}_${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

const reportTypes = [
  {
    key: "employees",
    label: "Employee Report",
    desc: "Full employee directory with stats",
    Icon: Users,
    color: "#4f46e5",
    bg: "#eef2ff",
  },
  {
    key: "attendance",
    label: "Attendance Report",
    desc: "Daily attendance with late/early",
    Icon: Clock,
    color: "#0891b2",
    bg: "#ecfeff",
  },
  {
    key: "leaves",
    label: "Leave Report",
    desc: "Leave history and trends",
    Icon: CalendarDays,
    color: "#059669",
    bg: "#ecfdf5",
  },
  {
    key: "departments",
    label: "Department Report",
    desc: "Department-wise insights",
    Icon: Building2,
    color: "#d97706",
    bg: "#fffbeb",
  },
  // ✅ NEW
  {
    key: "monthly",
    label: "Monthly Summary",
    desc: "Working days + leave analysis",
    Icon: Target,
    color: "#7c3aed",
    bg: "#ede9fe",
  },
];

const StatCard = ({ label, value, Icon, color, bg }) => (
  <div
    className="erp-card"
    style={{
      padding: 18,
      display: "flex",
      alignItems: "center",
      gap: 14,
      fontFamily: FONT,
    }}
  >
    <div
      style={{
        width: 44,
        height: 44,
        borderRadius: 12,
        background: bg,
        color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <Icon size={20} strokeWidth={2.4} />
    </div>
    <div style={{ minWidth: 0 }}>
      <div
        style={{
          fontSize: 10.5,
          fontWeight: 700,
          color: "#6b7280",
          textTransform: "uppercase",
          letterSpacing: 0.5,
          marginBottom: 3,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 800,
          color,
          lineHeight: 1,
          letterSpacing: "-0.3px",
        }}
      >
        {value}
      </div>
    </div>
  </div>
);

const MobileRecordCard = ({ children }) => (
  <div className="rpt-mobile-card">{children}</div>
);

const MobileField = ({ label, value, color }) => (
  <div>
    <div className="rpt-field-label">{label}</div>
    <div className="rpt-field-value" style={{ color }}>
      {value}
    </div>
  </div>
);

const ManagerReports = () => {
  const [summary, setSummary] = useState({});
  const [activeReport, setActiveReport] = useState(null);
  const [data, setData] = useState({
    records: [],
    summary: {},
    distribution: [],
    employees: [],
  });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [filters, setFilters] = useState({
    department_id: "",
    employee_id: "",
    status: "",
    search: "",
    start_date: new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1
    )
      .toISOString()
      .split("T")[0],
    end_date: new Date().toISOString().split("T")[0],
    month: currentMonthStr(),   // ✅ For monthly summary
  });

  const [detailEmployeeId, setDetailEmployeeId] = useState(null);

  useEffect(() => {
    api
      .getSummary()
      .then((r) => setSummary(r.data || {}))
      .catch(() => {});
    deptApi
      .listDepartments()
      .then((r) => setDepartments(r.data || []))
      .catch(() => {});
    empApi
      .listEmployees("", "", "ACTIVE")
      .then((r) => setEmployees(r.data || []))
      .catch(() => {});
  }, []);

  const loadReport = useCallback(async () => {
    if (!activeReport) return;
    setLoading(true);
    try {
      let res;
      switch (activeReport) {
        case "employees":
          res = await api.getEmployeeReport(filters);
          break;
        case "attendance":
          res = await api.getAttendanceReport(filters);
          break;
        case "leaves":
          res = await api.getLeaveReport(filters);
          break;
        case "departments":
          res = await api.getDepartmentReport();
          break;
        case "monthly": {
          const [y, m] = (filters.month || currentMonthStr()).split("-");
          res = await api.getMonthlySummary(parseInt(y), parseInt(m));
          break;
        }
        default:
          return;
      }
      const d = res.data || {};
      setData({
        records: d.records || [],
        summary: d.summary || {},
        distribution: d.distribution || [],
        employees: d.employees || [],
        // For monthly
        month_label: d.month_label,
        total_days: d.total_days,
        sundays: d.sundays,
        holidays: d.holidays,
        holiday_list: d.holiday_list || [],
        working_days: d.working_days,
      });
    } catch (e) {
      console.error(e);
      setToast({ message: "Failed to load report", type: "error" });
    } finally {
      setLoading(false);
    }
  }, [activeReport, filters]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const backToTypes = () => {
    setActiveReport(null);
    setData({
      records: [],
      summary: {},
      distribution: [],
      employees: [],
    });
    setDetailEmployeeId(null);
  };

  const handleExport = () => {
    let rows = [];
    if (activeReport === "monthly") {
      rows = (data.employees || []).map((e) => ({
        Name: e.name,
        Code: e.code,
        Department: e.department,
        Present: e.present_days,
        CL: e.cl_days,
        SL: e.sl_days,
        "Total Leave": e.leave_days,
        Absent: e.absent_days,
        "Payable Days": e.payable_days,
        "Attendance %": e.attendance_pct,
      }));
    } else {
      rows = data.records || [];
    }

    if (!rows.length) {
      setToast({ message: "No data to export", type: "error" });
      return;
    }
    exportCSV(rows, `${activeReport}_report`);
    setToast({ message: "CSV downloaded", type: "success" });
  };

  // ============================================
  // EMPLOYEE FULL REPORT (drill-down)
  // ============================================
  if (activeReport === "employees" && detailEmployeeId) {
    return (
      <Layout>
        <div style={{ fontFamily: FONT }}>
          <div className="mb-3">
            <h1 className="erp-page-title" style={{ fontSize: 22 }}>
              Employee Full Report
            </h1>
            <p
              className="erp-page-subtitle mb-0"
              style={{ fontSize: 12.5 }}
            >
              Complete records and analytics
            </p>
          </div>
          <EmployeeFullReport
            employeeId={detailEmployeeId}
            onBack={() => setDetailEmployeeId(null)}
          />
        </div>

        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </Layout>
    );
  }

  // ============================================
  // REPORT TYPE SELECTOR
  // ============================================
  if (!activeReport) {
    return (
      <Layout>
        <style>{`
          .rpt-page * { font-family: ${FONT}; }
          .rpt-page { font-family: ${FONT}; }
          .rpt-type-btn {
            width: 100%;
            padding: 20px;
            background: white;
            border: 1px solid var(--border);
            border-radius: 14px;
            cursor: pointer;
            text-align: left;
            font-family: ${FONT};
            transition: all 0.2s ease;
          }
          .rpt-type-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px -8px rgba(0,0,0,0.15);
          }
          @media (max-width: 767px) {
            .rpt-page .erp-page-title { font-size: 22px; }
            .rpt-page .erp-page-subtitle { font-size: 12.5px; }
            .rpt-page .erp-stat-value { font-size: 20px; }
            .rpt-page .erp-stat-label { font-size: 10.5px; }
            .rpt-type-btn { padding: 16px; }
          }
        `}</style>

        <div className="rpt-page">
          <div className="mb-4">
            <h1 className="erp-page-title">Reports</h1>
            <p className="erp-page-subtitle mb-0">
              Generate, view and export reports
            </p>
          </div>

          <div className="row g-3 mb-4">
            <div className="col-6 col-md-3">
              <StatCard
                label="Total Employees"
                value={summary.total_employees || 0}
                Icon={Users}
                color="#4f46e5"
                bg="#eef2ff"
              />
            </div>
            <div className="col-6 col-md-3">
              <StatCard
                label="Departments"
                value={summary.total_departments || 0}
                Icon={Building2}
                color="#0891b2"
                bg="#ecfeff"
              />
            </div>
            <div className="col-6 col-md-3">
              <StatCard
                label="Present Today"
                value={summary.present_today || 0}
                Icon={CheckCircle2}
                color="#059669"
                bg="#ecfdf5"
              />
            </div>
            <div className="col-6 col-md-3">
              <StatCard
                label="Pending Leaves"
                value={summary.pending_leaves || 0}
                Icon={AlertTriangle}
                color="#d97706"
                bg="#fffbeb"
              />
            </div>
          </div>

          <h5
            style={{
              fontWeight: 700,
              fontSize: 14,
              color: "#374151",
              textTransform: "uppercase",
              letterSpacing: 0.5,
              marginBottom: 14,
            }}
          >
            Select Report Type
          </h5>

          <div className="row g-3">
            {reportTypes.map((rt) => {
              const Icon = rt.Icon;
              return (
                <div className="col-12 col-md-6 col-lg-4" key={rt.key}>
                  <button
                    onClick={() => setActiveReport(rt.key)}
                    className="rpt-type-btn"
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = rt.color;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "var(--border)";
                    }}
                  >
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 12,
                        background: rt.bg,
                        color: rt.color,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: 14,
                      }}
                    >
                      <Icon size={22} strokeWidth={2.4} />
                    </div>
                    <div
                      style={{
                        fontSize: 14.5,
                        fontWeight: 700,
                        marginBottom: 4,
                        color: "#111827",
                      }}
                    >
                      {rt.label}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "#6b7280",
                        lineHeight: 1.4,
                      }}
                    >
                      {rt.desc}
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </Layout>
    );
  }

  // ============================================
  // ACTIVE REPORT VIEW
  // ============================================
  const activeType = reportTypes.find((r) => r.key === activeReport);
  const ActiveIcon = activeType?.Icon;

  return (
    <Layout>
      <style>{`
        .rpt-page * { font-family: ${FONT}; }
        .rpt-page { font-family: ${FONT}; }
        .rpt-header {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 22px;
          flex-wrap: wrap;
        }
        .rpt-header-actions {
          display: flex;
          gap: 8px;
          margin-left: auto;
        }
        .rpt-mobile-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 14px;
          margin-bottom: 10px;
          font-family: ${FONT};
        }
        .rpt-mobile-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 8px;
          margin-bottom: 10px;
          padding-bottom: 10px;
          border-bottom: 1px dashed #f1f5f9;
        }
        .rpt-mobile-name {
          font-weight: 700;
          font-size: 14px;
          color: #0f172a;
        }
        .rpt-mobile-sub {
          font-size: 11.5px;
          color: #94a3b8;
          margin-top: 2px;
        }
        .rpt-mobile-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px 12px;
          font-size: 12.5px;
        }
        .rpt-field-label {
          font-size: 10px;
          color: #94a3b8;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          margin-bottom: 3px;
        }
        .rpt-field-value {
          font-weight: 600;
          color: #0f172a;
          font-variant-numeric: tabular-nums;
        }
        @media (max-width: 767px) {
          .rpt-page { padding: 0 4px; }
          .rpt-header { gap: 10px; }
          .rpt-header-actions {
            width: 100%;
            margin-left: 0;
            flex-wrap: wrap;
          }
          .rpt-header-actions .erp-btn {
            flex: 1 1 calc(50% - 4px);
            justify-content: center;
            font-size: 12.5px;
            padding: 8px 10px;
          }
          .rpt-page .erp-page-title { font-size: 18px; }
          .rpt-page .erp-page-subtitle { font-size: 12px; }
          .rpt-page .erp-stat-value { font-size: 20px; }
          .rpt-page .erp-stat-label { font-size: 10.5px; }
        }
      `}</style>

      <div className="rpt-page">
        {/* Header */}
        <div className="rpt-header">
          <button
            onClick={backToTypes}
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "#f3f4f6",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#6b7280",
              transition: "all 0.15s",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#e5e7eb";
              e.currentTarget.style.color = "#111827";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#f3f4f6";
              e.currentTarget.style.color = "#6b7280";
            }}
          >
            <ArrowLeft size={16} />
          </button>

          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: activeType?.bg,
              color: activeType?.color,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <ActiveIcon size={20} strokeWidth={2.4} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <h1
              className="erp-page-title"
              style={{ fontSize: 20, marginBottom: 2 }}
            >
              {activeType?.label}
            </h1>
            <p
              className="erp-page-subtitle mb-0"
              style={{ fontSize: 12.5 }}
            >
              {activeType?.desc}
            </p>
          </div>

          <div className="rpt-header-actions">
            <button
              className="erp-btn erp-btn-outline"
              onClick={handleExport}
              style={{ fontFamily: FONT }}
            >
              <Download size={14} /> Export CSV
            </button>
            <button
              className="erp-btn erp-btn-outline"
              onClick={() => window.print()}
              style={{ fontFamily: FONT }}
            >
              <Printer size={14} /> Print
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="erp-card mb-3" style={{ padding: 14 }}>
          <div className="row g-2">
            {/* Monthly summary — Month picker */}
            {activeReport === "monthly" && (
              <div className="col-12 col-md-4">
                <label className="erp-label">Month</label>
                <input
                  type="month"
                  className="erp-input"
                  value={filters.month}
                  onChange={(e) =>
                    setFilters({ ...filters, month: e.target.value })
                  }
                  style={{ fontFamily: FONT }}
                />
              </div>
            )}

            {(activeReport === "attendance" ||
              activeReport === "leaves") && (
              <>
                <div className="col-12 col-md-3">
                  <label className="erp-label">Start Date</label>
                  <input
                    type="date"
                    className="erp-input"
                    value={filters.start_date}
                    onChange={(e) =>
                      setFilters({ ...filters, start_date: e.target.value })
                    }
                  />
                </div>
                <div className="col-12 col-md-3">
                  <label className="erp-label">End Date</label>
                  <input
                    type="date"
                    className="erp-input"
                    value={filters.end_date}
                    onChange={(e) =>
                      setFilters({ ...filters, end_date: e.target.value })
                    }
                  />
                </div>
              </>
            )}

            {activeReport !== "departments" &&
              activeReport !== "monthly" && (
                <>
                  <div className="col-12 col-md-3">
                    <label className="erp-label">Department</label>
                    <select
                      className="erp-input"
                      value={filters.department_id}
                      onChange={(e) =>
                        setFilters({
                          ...filters,
                          department_id: e.target.value,
                        })
                      }
                    >
                      <option value="">All</option>
                      {departments.map((d) => (
                        <option key={d._id} value={d._id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {(activeReport === "attendance" ||
                    activeReport === "leaves") && (
                    <div className="col-12 col-md-3">
                      <label className="erp-label">Employee</label>
                      <select
                        className="erp-input"
                        value={filters.employee_id}
                        onChange={(e) =>
                          setFilters({
                            ...filters,
                            employee_id: e.target.value,
                          })
                        }
                      >
                        <option value="">All</option>
                        {employees.map((emp) => (
                          <option key={emp._id} value={emp._id}>
                            {emp.first_name} {emp.last_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {activeReport === "leaves" && (
                    <div className="col-12 col-md-3">
                      <label className="erp-label">Status</label>
                      <select
                        className="erp-input"
                        value={filters.status}
                        onChange={(e) =>
                          setFilters({ ...filters, status: e.target.value })
                        }
                      >
                        <option value="">All</option>
                        <option value="Pending">Pending</option>
                        <option value="Approved">Approved</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    </div>
                  )}

                  {activeReport === "employees" && (
                    <>
                      <div className="col-12 col-md-3">
                        <label className="erp-label">Status</label>
                        <select
                          className="erp-input"
                          value={filters.status}
                          onChange={(e) =>
                            setFilters({
                              ...filters,
                              status: e.target.value,
                            })
                          }
                        >
                          <option value="">All</option>
                          <option value="ACTIVE">Active</option>
                          <option value="INACTIVE">Inactive</option>
                          <option value="NOTICE_PERIOD">Notice Period</option>
                          <option value="RESIGNED">Resigned</option>
                        </select>
                      </div>
                      <div className="col-12 col-md-3">
                        <label className="erp-label">Search</label>
                        <div className="erp-input-wrapper">
                          <Search size={14} className="erp-input-icon" />
                          <input
                            className="erp-input"
                            placeholder="Name or code..."
                            value={filters.search}
                            onChange={(e) =>
                              setFilters({
                                ...filters,
                                search: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
          </div>

          {/* ✅ Holiday list for monthly */}
          {activeReport === "monthly" &&
            data.holiday_list?.length > 0 && (
              <div
                style={{
                  marginTop: 12,
                  padding: "10px 14px",
                  background: "#fef3c7",
                  border: "1px solid #fcd34d",
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  flexWrap: "wrap",
                  fontSize: 12,
                  color: "#92400e",
                }}
              >
                <PartyPopper size={14} />
                <strong>Holidays this month:</strong>
                {data.holiday_list.map((h, i) => (
                  <span
                    key={i}
                    style={{
                      background: "white",
                      padding: "3px 10px",
                      borderRadius: 20,
                      fontSize: 11.5,
                      fontWeight: 600,
                      border: "1px solid #fcd34d",
                    }}
                  >
                    {h.name} · {formatDate(h.date).slice(0, 6)}
                  </span>
                ))}
              </div>
            )}
        </div>

        {/* Summary cards */}
        {data.summary && (
          <div className="row g-3 mb-3">
            {activeReport === "employees" && (
              <>
                <div className="col-6 col-md-4">
                  <StatCard
                    label="Total Employees"
                    value={data.summary.total || 0}
                    Icon={Users}
                    color="#4f46e5"
                    bg="#eef2ff"
                  />
                </div>
                <div className="col-6 col-md-4">
                  <StatCard
                    label="Active"
                    value={data.summary.active || 0}
                    Icon={CheckCircle2}
                    color="#059669"
                    bg="#ecfdf5"
                  />
                </div>
                <div className="col-6 col-md-4">
                  <StatCard
                    label="Inactive"
                    value={data.summary.inactive || 0}
                    Icon={XCircle}
                    color="#dc2626"
                    bg="#fef2f2"
                  />
                </div>
              </>
            )}

            {activeReport === "attendance" && (
              <>
                <div className="col-6 col-md-3">
                  <StatCard
                    label="Present"
                    value={data.summary.present || 0}
                    Icon={CheckCircle2}
                    color="#059669"
                    bg="#ecfdf5"
                  />
                </div>
                <div className="col-6 col-md-3">
                  <StatCard
                    label="Late"
                    value={data.summary.late || 0}
                    Icon={AlertTriangle}
                    color="#d97706"
                    bg="#fffbeb"
                  />
                </div>
                <div className="col-6 col-md-3">
                  <StatCard
                    label="Early Logout"
                    value={data.summary.early || 0}
                    Icon={XCircle}
                    color="#dc2626"
                    bg="#fef2f2"
                  />
                </div>
                <div className="col-6 col-md-3">
                  <StatCard
                    label="Total Hours"
                    value={formatHours(data.summary.total_hours)}
                    Icon={TrendingUp}
                    color="#4f46e5"
                    bg="#eef2ff"
                  />
                </div>
              </>
            )}

            {activeReport === "leaves" && (
              <>
                <div className="col-6 col-md-3">
                  <StatCard
                    label="Total"
                    value={data.summary.total || 0}
                    Icon={CalendarDays}
                    color="#4f46e5"
                    bg="#eef2ff"
                  />
                </div>
                <div className="col-6 col-md-3">
                  <StatCard
                    label="Approved"
                    value={data.summary.approved || 0}
                    Icon={CheckCircle2}
                    color="#059669"
                    bg="#ecfdf5"
                  />
                </div>
                <div className="col-6 col-md-3">
                  <StatCard
                    label="Pending"
                    value={data.summary.pending || 0}
                    Icon={Clock}
                    color="#d97706"
                    bg="#fffbeb"
                  />
                </div>
                <div className="col-6 col-md-3">
                  <StatCard
                    label="Total Days"
                    value={data.summary.total_days || 0}
                    Icon={TrendingUp}
                    color="#0891b2"
                    bg="#ecfeff"
                  />
                </div>
              </>
            )}

            {activeReport === "departments" && (
              <>
                <div className="col-6 col-md-6">
                  <StatCard
                    label="Total Departments"
                    value={data.summary.total_departments || 0}
                    Icon={Building2}
                    color="#0891b2"
                    bg="#ecfeff"
                  />
                </div>
                <div className="col-6 col-md-6">
                  <StatCard
                    label="Total Employees"
                    value={data.summary.total_employees || 0}
                    Icon={Users}
                    color="#4f46e5"
                    bg="#eef2ff"
                  />
                </div>
              </>
            )}

            {/* ✅ Monthly Summary cards */}
            {activeReport === "monthly" && (
              <>
                <div className="col-6 col-md-3">
                  <StatCard
                    label="Working Days"
                    value={data.working_days || 0}
                    Icon={CalendarDays}
                    color="#4f46e5"
                    bg="#eef2ff"
                  />
                </div>
                <div className="col-6 col-md-3">
                  <StatCard
                    label="Sundays"
                    value={data.sundays || 0}
                    Icon={Calendar}
                    color="#dc2626"
                    bg="#fef2f2"
                  />
                </div>
                <div className="col-6 col-md-3">
                  <StatCard
                    label="Holidays"
                    value={data.holidays || 0}
                    Icon={PartyPopper}
                    color="#d97706"
                    bg="#fffbeb"
                  />
                </div>
                <div className="col-6 col-md-3">
                  <StatCard
                    label="Total Days"
                    value={data.total_days || 0}
                    Icon={TrendingUp}
                    color="#0891b2"
                    bg="#ecfeff"
                  />
                </div>
              </>
            )}
          </div>
        )}

        {/* Chart + Table */}
        <div className="row g-3">
          {data.distribution && data.distribution.length > 0 && (
            <div className="col-12 col-lg-4">
              <div
                className="erp-card"
                style={{ padding: 18, height: "100%" }}
              >
                <div
                  style={{
                    fontSize: 11.5,
                    fontWeight: 700,
                    color: "#374151",
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                    marginBottom: 12,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <PieIcon size={13} strokeWidth={2.5} color="#4f46e5" />
                  {activeReport === "leaves"
                    ? "Leave Type Distribution"
                    : "Employees by Department"}
                </div>

                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={data.distribution}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      innerRadius={40}
                      paddingAngle={3}
                      label={({ name, percent }) =>
                        `${name} (${(percent * 100).toFixed(0)}%)`
                      }
                      labelLine={false}
                      style={{ fontSize: 11, fontFamily: FONT }}
                    >
                      {data.distribution.map((_, idx) => (
                        <Cell
                          key={idx}
                          fill={COLORS[idx % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        fontFamily: FONT,
                        fontSize: 12,
                        borderRadius: 8,
                        border: "1px solid #e5e7eb",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div
            className={
              data.distribution && data.distribution.length > 0
                ? "col-12 col-lg-8"
                : "col-12"
            }
          >
            <div
              className="erp-card"
              style={{ padding: 0, overflow: "hidden", height: "100%" }}
            >
              <div
                style={{
                  padding: "14px 18px",
                  borderBottom: "1px solid var(--border)",
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: "#374151",
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span>Detailed Records</span>
                <span style={{ color: "#9ca3af", fontWeight: 500 }}>
                  {activeReport === "monthly"
                    ? data.employees?.length || 0
                    : data.records?.length || 0}{" "}
                  rows
                </span>
              </div>

              {loading ? (
                <div
                  className="text-center py-5"
                  style={{ color: "#9ca3af", fontFamily: FONT }}
                >
                  <div className="spinner-border spinner-border-sm me-2" />
                  Loading...
                </div>
              ) : (activeReport === "monthly"
                  ? !data.employees || data.employees.length === 0
                  : !data.records || data.records.length === 0) ? (
                <div
                  className="text-center py-5"
                  style={{ color: "#9ca3af", fontFamily: FONT }}
                >
                  <FileText
                    size={36}
                    style={{
                      display: "block",
                      margin: "0 auto 10px",
                      opacity: 0.4,
                    }}
                  />
                  No data for the selected filters
                </div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div
                    className="table-responsive d-none d-lg-block"
                    style={{ maxHeight: 480, overflowY: "auto" }}
                  >
                    <table className="erp-table" style={{ fontFamily: FONT }}>
                      <thead
                        style={{ position: "sticky", top: 0, zIndex: 1 }}
                      >
                        {activeReport === "employees" && (
                          <tr>
                            <th>Employee</th>
                            <th>Code</th>
                            <th>Department</th>
                            <th>Joined</th>
                            <th>Present</th>
                            <th>Late</th>
                            <th>Status</th>
                            <th style={{ width: 60 }}></th>
                          </tr>
                        )}
                        {activeReport === "attendance" && (
                          <tr>
                            <th>Date</th>
                            <th>Employee</th>
                            <th>Check In</th>
                            <th>Check Out</th>
                            <th>Hours</th>
                            <th>Late</th>
                            <th>Early</th>
                            <th>Status</th>
                          </tr>
                        )}
                        {activeReport === "leaves" && (
                          <tr>
                            <th>Employee</th>
                            <th>Type</th>
                            <th>From</th>
                            <th>To</th>
                            <th>Days</th>
                            <th>Status</th>
                          </tr>
                        )}
                        {activeReport === "departments" && (
                          <tr>
                            <th>Department</th>
                            <th>Employees</th>
                            <th>Avg Hours</th>
                            <th>Description</th>
                          </tr>
                        )}
                        {/* ✅ Monthly Summary */}
                        {activeReport === "monthly" && (
                          <tr>
                            <th>Employee</th>
                            <th>Code</th>
                            <th>Dept</th>
                            <th style={{ textAlign: "center" }}>Present</th>
                            <th style={{ textAlign: "center" }}>CL</th>
                            <th style={{ textAlign: "center" }}>SL</th>
                            <th style={{ textAlign: "center" }}>
                              Total Leave
                            </th>
                            <th style={{ textAlign: "center" }}>Absent</th>
                            <th style={{ textAlign: "center" }}>Payable</th>
                            <th style={{ textAlign: "center" }}>Att %</th>
                          </tr>
                        )}
                      </thead>
                      <tbody>
                        {activeReport === "employees" &&
                          data.records.map((r) => (
                            <tr key={r.employee_id}>
                              <td style={{ fontWeight: 600 }}>{r.name}</td>
                              <td>
                                <span className="erp-badge erp-badge-gray">
                                  {r.code}
                                </span>
                              </td>
                              <td>{r.department}</td>
                              <td style={{ fontSize: 12.5 }}>
                                {formatDate(r.joined)}
                              </td>
                              <td>{r.present_days}</td>
                              <td>
                                {r.late_days > 0 ? (
                                  <span
                                    style={{
                                      color: "#dc2626",
                                      fontWeight: 600,
                                    }}
                                  >
                                    {r.late_days}
                                  </span>
                                ) : (
                                  <span style={{ color: "#9ca3af" }}>0</span>
                                )}
                              </td>
                              <td>
                                <span
                                  className={
                                    r.status === "ACTIVE"
                                      ? "erp-badge erp-badge-green"
                                      : "erp-badge erp-badge-gray"
                                  }
                                >
                                  ● {r.status}
                                </span>
                              </td>
                              <td>
                                <button
                                  className="erp-icon-btn"
                                  onClick={() =>
                                    setDetailEmployeeId(r.employee_id)
                                  }
                                  title="View Full Report"
                                  style={{ padding: 4, color: "#4f46e5" }}
                                >
                                  <Eye size={13} />
                                </button>
                              </td>
                            </tr>
                          ))}

                        {activeReport === "attendance" &&
                          data.records.map((r, i) => (
                            <tr key={i}>
                              <td style={{ fontSize: 12.5 }}>
                                {formatDate(r.date)}
                              </td>
                              <td>
                                <div style={{ fontWeight: 600 }}>
                                  {r.employee_name}
                                </div>
                                <div
                                  style={{
                                    fontSize: 11,
                                    color: "#6b7280",
                                  }}
                                >
                                  {r.employee_code}
                                </div>
                              </td>
                              <td>{formatTime(r.check_in)}</td>
                              <td>{formatTime(r.check_out)}</td>
                              <td>{formatHours(r.working_hours)}</td>
                              <td>
                                {r.late_minutes > 0 ? (
                                  <span
                                    style={{
                                      color: "#dc2626",
                                      fontWeight: 600,
                                    }}
                                  >
                                    {r.late_minutes}m
                                  </span>
                                ) : (
                                  <span style={{ color: "#9ca3af" }}>—</span>
                                )}
                              </td>
                              <td>
                                {r.early_minutes > 0 ? (
                                  <span
                                    style={{
                                      color: "#d97706",
                                      fontWeight: 600,
                                    }}
                                  >
                                    {r.early_minutes}m
                                  </span>
                                ) : (
                                  <span style={{ color: "#9ca3af" }}>—</span>
                                )}
                              </td>
                              <td>
                                <span
                                  className={
                                    r.status === "PRESENT"
                                      ? "erp-badge erp-badge-green"
                                      : r.status.includes("Late")
                                      ? "erp-badge erp-badge-red"
                                      : "erp-badge erp-badge-gray"
                                  }
                                >
                                  {r.status}
                                </span>
                              </td>
                            </tr>
                          ))}

                        {activeReport === "leaves" &&
                          data.records.map((r, i) => (
                            <tr key={i}>
                              <td>
                                <div style={{ fontWeight: 600 }}>
                                  {r.employee_name}
                                </div>
                                <div
                                  style={{
                                    fontSize: 11,
                                    color: "#6b7280",
                                  }}
                                >
                                  {r.employee_code}
                                </div>
                              </td>
                              <td>
                                <span className="erp-badge erp-badge-blue">
                                  {r.leave_type}
                                </span>
                              </td>
                              <td style={{ fontSize: 12.5 }}>
                                {formatDate(r.start_date)}
                              </td>
                              <td style={{ fontSize: 12.5 }}>
                                {formatDate(r.end_date)}
                              </td>
                              <td>
                                <strong>{r.total_days}d</strong>
                              </td>
                              <td>
                                <span
                                  className={
                                    r.status === "Approved"
                                      ? "erp-badge erp-badge-green"
                                      : r.status === "Pending"
                                      ? "erp-badge erp-badge-yellow"
                                      : r.status === "Rejected"
                                      ? "erp-badge erp-badge-red"
                                      : "erp-badge erp-badge-gray"
                                  }
                                >
                                  ● {r.status}
                                </span>
                              </td>
                            </tr>
                          ))}

                        {activeReport === "departments" &&
                          data.records.map((r) => (
                            <tr key={r.department_id}>
                              <td style={{ fontWeight: 600 }}>{r.name}</td>
                              <td>
                                <span className="erp-badge erp-badge-blue">
                                  {r.employee_count} employees
                                </span>
                              </td>
                              <td>{formatHours(r.avg_hours)}</td>
                              <td
                                style={{
                                  fontSize: 12.5,
                                  color: "#6b7280",
                                  maxWidth: 300,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {r.description || "—"}
                              </td>
                            </tr>
                          ))}

                        {/* ✅ Monthly Summary rows */}
                        {activeReport === "monthly" &&
                          data.employees.map((e) => (
                            <tr key={e.employee_id}>
                              <td style={{ fontWeight: 600 }}>{e.name}</td>
                              <td>
                                <span className="erp-badge erp-badge-gray">
                                  {e.code}
                                </span>
                              </td>
                              <td style={{ fontSize: 12.5 }}>
                                {e.department || "—"}
                              </td>
                              <td
                                style={{
                                  textAlign: "center",
                                  fontWeight: 700,
                                  color: "#059669",
                                }}
                              >
                                {e.present_days}
                              </td>
                              <td
                                style={{
                                  textAlign: "center",
                                  color: "#4f46e5",
                                  fontWeight: 600,
                                }}
                              >
                                {e.cl_days || 0}
                              </td>
                              <td
                                style={{
                                  textAlign: "center",
                                  color: "#0891b2",
                                  fontWeight: 600,
                                }}
                              >
                                {e.sl_days || 0}
                              </td>
                              <td
                                style={{
                                  textAlign: "center",
                                  fontWeight: 700,
                                }}
                              >
                                {e.leave_days || 0}
                              </td>
                              <td
                                style={{
                                  textAlign: "center",
                                  color:
                                    e.absent_days > 0
                                      ? "#dc2626"
                                      : "#9ca3af",
                                  fontWeight:
                                    e.absent_days > 0 ? 700 : 400,
                                }}
                              >
                                {e.absent_days}
                              </td>
                              <td
                                style={{
                                  textAlign: "center",
                                  fontWeight: 700,
                                  color: "#7c3aed",
                                }}
                              >
                                {e.payable_days}
                              </td>
                              <td style={{ textAlign: "center" }}>
                                <span
                                  className="erp-badge"
                                  style={{
                                    background:
                                      e.attendance_pct >= 90
                                        ? "#dcfce7"
                                        : e.attendance_pct >= 75
                                        ? "#fef3c7"
                                        : "#fee2e2",
                                    color:
                                      e.attendance_pct >= 90
                                        ? "#166534"
                                        : e.attendance_pct >= 75
                                        ? "#92400e"
                                        : "#991b1b",
                                    fontWeight: 700,
                                  }}
                                >
                                  {e.attendance_pct}%
                                </span>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="d-lg-none" style={{ padding: 12 }}>
                    {activeReport === "employees" &&
                      data.records.map((r) => (
                        <MobileRecordCard key={r.employee_id}>
                          <div className="rpt-mobile-head">
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div className="rpt-mobile-name">
                                {r.name}
                              </div>
                              <div className="rpt-mobile-sub">
                                {r.code}
                                {r.department && ` · ${r.department}`}
                              </div>
                            </div>
                            <span
                              className={
                                r.status === "ACTIVE"
                                  ? "erp-badge erp-badge-green"
                                  : "erp-badge erp-badge-gray"
                              }
                              style={{ flexShrink: 0 }}
                            >
                              ● {r.status}
                            </span>
                          </div>
                          <div className="rpt-mobile-grid">
                            <MobileField
                              label="Joined"
                              value={formatDate(r.joined)}
                            />
                            <MobileField
                              label="Present"
                              value={r.present_days}
                            />
                            <MobileField
                              label="Late"
                              value={r.late_days || 0}
                              color={
                                r.late_days > 0 ? "#dc2626" : "#0f172a"
                              }
                            />
                            <div
                              style={{
                                display: "flex",
                                alignItems: "flex-end",
                              }}
                            >
                              <button
                                className="erp-icon-btn"
                                onClick={() =>
                                  setDetailEmployeeId(r.employee_id)
                                }
                                style={{
                                  color: "#4f46e5",
                                  padding: "6px 10px",
                                  borderRadius: 8,
                                  background: "#eef2ff",
                                  border: "1px solid #c7d2fe",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 5,
                                  fontSize: 12,
                                  fontWeight: 600,
                                  cursor: "pointer",
                                }}
                              >
                                <Eye size={12} /> Full Report
                              </button>
                            </div>
                          </div>
                        </MobileRecordCard>
                      ))}

                    {activeReport === "attendance" &&
                      data.records.map((r, i) => (
                        <MobileRecordCard key={i}>
                          <div className="rpt-mobile-head">
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div className="rpt-mobile-name">
                                {r.employee_name}
                              </div>
                              <div className="rpt-mobile-sub">
                                {r.employee_code} · {formatDate(r.date)}
                              </div>
                            </div>
                            <span
                              className={
                                r.status === "PRESENT"
                                  ? "erp-badge erp-badge-green"
                                  : r.status.includes("Late")
                                  ? "erp-badge erp-badge-red"
                                  : "erp-badge erp-badge-gray"
                              }
                              style={{ flexShrink: 0, fontSize: 10 }}
                            >
                              {r.status}
                            </span>
                          </div>
                          <div className="rpt-mobile-grid">
                            <MobileField
                              label="Check In"
                              value={formatTime(r.check_in)}
                              color={
                                r.late_minutes > 0 ? "#dc2626" : undefined
                              }
                            />
                            <MobileField
                              label="Check Out"
                              value={formatTime(r.check_out)}
                            />
                            <MobileField
                              label="Hours"
                              value={formatHours(r.working_hours)}
                            />
                            <MobileField
                              label="Late"
                              value={
                                r.late_minutes > 0
                                  ? `${r.late_minutes}m`
                                  : "—"
                              }
                              color={
                                r.late_minutes > 0 ? "#dc2626" : "#9ca3af"
                              }
                            />
                            {r.early_minutes > 0 && (
                              <MobileField
                                label="Early"
                                value={`${r.early_minutes}m`}
                                color="#d97706"
                              />
                            )}
                          </div>
                        </MobileRecordCard>
                      ))}

                    {activeReport === "leaves" &&
                      data.records.map((r, i) => (
                        <MobileRecordCard key={i}>
                          <div className="rpt-mobile-head">
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div className="rpt-mobile-name">
                                {r.employee_name}
                              </div>
                              <div className="rpt-mobile-sub">
                                {r.employee_code}
                              </div>
                            </div>
                            <span
                              className={
                                r.status === "Approved"
                                  ? "erp-badge erp-badge-green"
                                  : r.status === "Pending"
                                  ? "erp-badge erp-badge-yellow"
                                  : r.status === "Rejected"
                                  ? "erp-badge erp-badge-red"
                                  : "erp-badge erp-badge-gray"
                              }
                              style={{ flexShrink: 0, fontSize: 10 }}
                            >
                              ● {r.status}
                            </span>
                          </div>
                          <div className="rpt-mobile-grid">
                            <div style={{ gridColumn: "1 / -1" }}>
                              <div className="rpt-field-label">Type</div>
                              <div
                                className="rpt-field-value"
                                style={{ marginTop: 4 }}
                              >
                                <span className="erp-badge erp-badge-blue">
                                  {r.leave_type}
                                </span>
                              </div>
                            </div>
                            <MobileField
                              label="From"
                              value={formatDate(r.start_date)}
                            />
                            <MobileField
                              label="To"
                              value={formatDate(r.end_date)}
                            />
                            <MobileField
                              label="Days"
                              value={`${r.total_days}d`}
                              color="#4f46e5"
                            />
                          </div>
                        </MobileRecordCard>
                      ))}

                    {activeReport === "departments" &&
                      data.records.map((r) => (
                        <MobileRecordCard key={r.department_id}>
                          <div className="rpt-mobile-head">
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div className="rpt-mobile-name">{r.name}</div>
                            </div>
                            <span
                              className="erp-badge erp-badge-blue"
                              style={{ flexShrink: 0 }}
                            >
                              {r.employee_count} employees
                            </span>
                          </div>
                          <div className="rpt-mobile-grid">
                            <MobileField
                              label="Avg Hours"
                              value={formatHours(r.avg_hours)}
                            />
                            {r.description && (
                              <div style={{ gridColumn: "1 / -1" }}>
                                <div className="rpt-field-label">
                                  Description
                                </div>
                                <div
                                  className="rpt-field-value"
                                  style={{
                                    fontWeight: 500,
                                    color: "#475569",
                                  }}
                                >
                                  {r.description}
                                </div>
                              </div>
                            )}
                          </div>
                        </MobileRecordCard>
                      ))}

                    {/* ✅ Monthly Summary mobile cards */}
                    {activeReport === "monthly" &&
                      data.employees.map((e) => (
                        <MobileRecordCard key={e.employee_id}>
                          <div className="rpt-mobile-head">
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div className="rpt-mobile-name">
                                {e.name}
                              </div>
                              <div className="rpt-mobile-sub">
                                {e.code}
                                {e.department && ` · ${e.department}`}
                              </div>
                            </div>
                            <span
                              className="erp-badge"
                              style={{
                                background:
                                  e.attendance_pct >= 90
                                    ? "#dcfce7"
                                    : e.attendance_pct >= 75
                                    ? "#fef3c7"
                                    : "#fee2e2",
                                color:
                                  e.attendance_pct >= 90
                                    ? "#166534"
                                    : e.attendance_pct >= 75
                                    ? "#92400e"
                                    : "#991b1b",
                                fontWeight: 700,
                                fontSize: 10,
                                flexShrink: 0,
                              }}
                            >
                              {e.attendance_pct}%
                            </span>
                          </div>

                          <div className="rpt-mobile-grid">
                            <MobileField
                              label="Present"
                              value={e.present_days}
                              color="#059669"
                            />
                            <MobileField
                              label="Absent"
                              value={e.absent_days}
                              color={
                                e.absent_days > 0 ? "#dc2626" : "#9ca3af"
                              }
                            />
                            <MobileField
                              label="CL"
                              value={e.cl_days || 0}
                              color="#4f46e5"
                            />
                            <MobileField
                              label="SL"
                              value={e.sl_days || 0}
                              color="#0891b2"
                            />
                            <MobileField
                              label="Total Leave"
                              value={e.leave_days || 0}
                            />
                            <MobileField
                              label="Payable Days"
                              value={e.payable_days}
                              color="#7c3aed"
                            />
                          </div>
                        </MobileRecordCard>
                      ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </Layout>
  );
};

export default ManagerReports;