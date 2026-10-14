import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  CheckCircle2,
  CalendarDays,
  Building2,
  Clock,
  UserPlus,
  BarChart3,
  TrendingUp,
  PieChart as PieIcon,
  Activity,
} from "lucide-react";
import Layout from "../../components/layout/Layout";
import { useAuth } from "../../hooks/useAuth";
import * as api from "../../api/dashboardApi";
import * as empApi from "../../api/employeeApi";

const FONT = "'Inter', 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif";

// ============================================
// Stat Card
// ============================================
const StatCard = ({ title, value, Icon, color, bg, subtitle }) => (
  <div className="col-6 col-lg-3">
    <div className="erp-card erp-stat-card" style={{ fontFamily: FONT }}>
      <div>
        <p className="erp-stat-label" style={{ fontFamily: FONT }}>
          {title}
        </p>
        <p className="erp-stat-value" style={{ fontFamily: FONT }}>
          {value}
        </p>
        {subtitle && (
          <small
            style={{ color: "#6b7280", fontSize: 11, fontFamily: FONT }}
          >
            {subtitle}
          </small>
        )}
      </div>
      <div className="erp-stat-icon" style={{ backgroundColor: bg, color }}>
        <Icon size={22} />
      </div>
    </div>
  </div>
);

// ============================================
// ✅ Simple Donut Chart (SVG, no library)
// ============================================
const DonutChart = ({ segments, size = 180, strokeWidth = 22 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((s, seg) => s + seg.value, 0);

  if (total === 0) {
    return (
      <svg width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
        />
      </svg>
    );
  }

  let offset = 0;
  return (
    <svg width={size} height={size}>
      <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
        {segments.map((seg, i) => {
          const pct = seg.value / total;
          const dashLength = pct * circumference;
          const dashArray = `${dashLength} ${circumference - dashLength}`;
          const dashOffset = -offset;
          offset += dashLength;
          return (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={strokeWidth}
              strokeDasharray={dashArray}
              strokeDashoffset={dashOffset}
              strokeLinecap="butt"
            />
          );
        })}
      </g>
    </svg>
  );
};

// ============================================
// Chart Legend
// ============================================
const ChartLegend = ({ items }) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      gap: 10,
      fontFamily: FONT,
    }}
  >
    {items.map((item, i) => (
      <div
        key={i}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontSize: 13,
        }}
      >
        <span
          style={{
            width: 12,
            height: 12,
            borderRadius: 3,
            background: item.color,
            flexShrink: 0,
          }}
        />
        <span
          style={{ flex: 1, color: "#4b5563", fontWeight: 500 }}
        >
          {item.label}
        </span>
        <span style={{ fontWeight: 700, color: "#111827" }}>
          {item.value}
        </span>
      </div>
    ))}
  </div>
);

// ============================================
// Manager Dashboard
// ============================================
const ManagerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    total_employees: 0,
    present_today: 0,
    working_now: 0,
    pending_leaves: 0,
    total_departments: 0,
    absent_today: 0,
    on_leave: 0,
  });
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, empRes, deptRes] = await Promise.allSettled([
          api.getManagerStats(),
          empApi.listEmployees("", "", "ACTIVE", ""),
          api.getDepartments?.() || Promise.resolve({ data: [] }),
        ]);

        if (statsRes.status === "fulfilled") {
          const data = statsRes.value.data || {};
          // ✅ FIX: Exclude manager/admin from count
          const totalEmp = Math.max(0, (data.total_employees || 0) - 1);
          setStats({
            ...data,
            total_employees: totalEmp,
          });
        }

        if (empRes.status === "fulfilled") {
          setEmployees(Array.isArray(empRes.value.data) ? empRes.value.data : []);
        }
      } catch (e) {
        console.error("Failed to load stats:", e);
      } finally {
        setLoading(false);
      }
    };
    load();

    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, []);

  // ============================================
  // Compute department breakdown for pie chart
  // ============================================
  const deptBreakdown = (() => {
    const map = {};
    employees.forEach((emp) => {
      const dept = emp.department_name || "Unassigned";
      map[dept] = (map[dept] || 0) + 1;
    });
    return Object.entries(map).map(([label, value]) => ({ label, value }));
  })();

  const COLORS = [
    "#6366f1",
    "#8b5cf6",
    "#ec4899",
    "#f59e0b",
    "#10b981",
    "#06b6d4",
    "#ef4444",
    "#84cc16",
  ];

  const pieSegments = deptBreakdown.map((d, i) => ({
    label: d.label,
    value: d.value,
    color: COLORS[i % COLORS.length],
  }));

  // Attendance pie segments
  const attendanceSegments = [
    { label: "Present", value: stats.present_today || 0, color: "#10b981" },
    {
      label: "Working Now",
      value: stats.working_now || 0,
      color: "#6366f1",
    },
    {
      label: "Absent",
      value: Math.max(
        0,
        (stats.total_employees || 0) - (stats.present_today || 0)
      ),
      color: "#ef4444",
    },
  ].filter((s) => s.value > 0);

  return (
    <Layout>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

        .mgr-dashboard,
        .mgr-dashboard * {
          font-family: ${FONT};
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        .mgr-chart-card {
          padding: 22px;
          height: 100%;
        }

        .mgr-chart-head {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 18px;
          padding-bottom: 12px;
          border-bottom: 1px solid #f1f5f9;
        }

        .mgr-chart-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .mgr-chart-title {
          font-weight: 700;
          font-size: 14px;
          color: #0f172a;
        }

        .mgr-chart-sub {
          font-size: 12px;
          color: #6b7280;
          margin-top: 2px;
        }

        .mgr-chart-body {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 24px;
          flex-wrap: wrap;
        }

        @media (max-width: 767px) {
          .mgr-chart-card {
            padding: 16px;
          }
          .mgr-chart-body {
            flex-direction: column;
            gap: 16px;
          }
          .mgr-page-title {
            font-size: 22px;
          }
        }

        /* Stat card mobile tweaks */
        @media (max-width: 480px) {
          .erp-stat-value {
            font-size: 22px !important;
          }
          .erp-stat-label {
            font-size: 10px !important;
          }
        }
      `}</style>

      <div className="mgr-dashboard">
        {/* Header */}
        <div className="mb-4">
          <h1 className="erp-page-title mgr-page-title">Dashboard</h1>
          <p className="erp-page-subtitle mb-0">
            Welcome back, {user?.first_name} {user?.last_name}
          </p>
        </div>

        {/* Stats Row */}
        <div className="row g-3 mb-4">
          <StatCard
            title="Total Employees"
            value={loading ? "..." : stats.total_employees}
            Icon={Users}
            color="#4f46e5"
            bg="#eef2ff"
            subtitle={`${stats.working_now || 0} working now`}
          />
          <StatCard
            title="Present Today"
            value={loading ? "..." : stats.present_today}
            Icon={CheckCircle2}
            color="#059669"
            bg="#ecfdf5"
            subtitle={
              stats.total_employees > 0
                ? `${Math.round(
                    (stats.present_today / stats.total_employees) * 100
                  )}% of total`
                : "No employees"
            }
          />
          <StatCard
            title="Pending Leaves"
            value={loading ? "..." : stats.pending_leaves}
            Icon={CalendarDays}
            color="#d97706"
            bg="#fef3c7"
            subtitle={
              stats.pending_leaves > 0 ? "Needs review" : "All caught up"
            }
          />
          <StatCard
            title="Departments"
            value={loading ? "..." : stats.total_departments}
            Icon={Building2}
            color="#0891b2"
            bg="#ecfeff"
            subtitle="Active departments"
          />
        </div>

        {/* ✅ Pie Charts Row */}
        <div className="row g-3 mb-4">
          {/* Department Distribution */}
          <div className="col-12 col-lg-6">
            <div className="erp-card mgr-chart-card">
              <div className="mgr-chart-head">
                <div
                  className="mgr-chart-icon"
                  style={{ background: "#eef2ff", color: "#4f46e5" }}
                >
                  <PieIcon size={18} />
                </div>
                <div>
                  <div className="mgr-chart-title">
                    Department Distribution
                  </div>
                  <div className="mgr-chart-sub">
                    Employees across departments
                  </div>
                </div>
              </div>

              {pieSegments.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: 30,
                    color: "#9ca3af",
                    fontSize: 13,
                  }}
                >
                  No data available
                </div>
              ) : (
                <div className="mgr-chart-body">
                  <DonutChart segments={pieSegments} size={170} />
                  <div style={{ flex: 1, minWidth: 140 }}>
                    <ChartLegend items={pieSegments} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Today's Attendance */}
          <div className="col-12 col-lg-6">
            <div className="erp-card mgr-chart-card">
              <div className="mgr-chart-head">
                <div
                  className="mgr-chart-icon"
                  style={{ background: "#ecfdf5", color: "#059669" }}
                >
                  <Activity size={18} />
                </div>
                <div>
                  <div className="mgr-chart-title">
                    Today's Attendance
                  </div>
                  <div className="mgr-chart-sub">
                    Present vs absent overview
                  </div>
                </div>
              </div>

              {attendanceSegments.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: 30,
                    color: "#9ca3af",
                    fontSize: 13,
                  }}
                >
                  No attendance data yet
                </div>
              ) : (
                <div className="mgr-chart-body">
                  <DonutChart segments={attendanceSegments} size={170} />
                  <div style={{ flex: 1, minWidth: 140 }}>
                    <ChartLegend items={attendanceSegments} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="erp-card mb-3">
          <h5 style={{ fontWeight: 700, marginBottom: 16 }}>
            Quick Actions
          </h5>
          <div className="d-flex gap-2 flex-wrap">
            <button
              className="erp-btn erp-btn-primary"
              onClick={() => navigate("/manager/employees")}
            >
              <UserPlus size={14} /> Add Employee
            </button>
            <button
              className="erp-btn erp-btn-outline"
              onClick={() => navigate("/manager/departments")}
            >
              <Building2 size={14} /> Add Department
            </button>
            <button
              className="erp-btn erp-btn-outline"
              onClick={() => navigate("/manager/leaves")}
            >
              <CalendarDays size={14} /> Review Leaves
              {stats.pending_leaves > 0 && (
                <span
                  style={{
                    background: "#ef4444",
                    color: "white",
                    borderRadius: 10,
                    padding: "1px 7px",
                    fontSize: 10.5,
                    marginLeft: 4,
                    fontWeight: 700,
                  }}
                >
                  {stats.pending_leaves}
                </span>
              )}
            </button>
            <button
              className="erp-btn erp-btn-outline"
              onClick={() => navigate("/manager/attendance")}
            >
              <Clock size={14} /> View Attendance
            </button>
            <button
              className="erp-btn erp-btn-outline"
              onClick={() => navigate("/manager/reports")}
            >
              <BarChart3 size={14} /> Reports
            </button>
          </div>
        </div>

        {/* Info card if no data */}
        {!loading && stats.total_employees === 0 && (
          <div
            className="erp-card"
            style={{
              background: "#eef2ff",
              border: "1px solid #c7d2fe",
            }}
          >
            <div
              className="d-flex align-items-center gap-3"
              style={{ color: "#4338ca" }}
            >
              <TrendingUp size={24} />
              <div>
                <strong style={{ fontSize: 14 }}>
                  Get started with your ERP
                </strong>
                <p
                  style={{
                    margin: 0,
                    fontSize: 13,
                    marginTop: 2,
                  }}
                >
                  Add departments first, then employees. They can then log in
                  with their credentials.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ManagerDashboard;