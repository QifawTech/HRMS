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
} from "lucide-react";
import Layout from "../../components/layout/Layout";
import { useAuth } from "../../hooks/useAuth";
import * as api from "../../api/dashboardApi";
import { formatDateTime } from "../../utils/dateUtils";

const StatCard = ({ title, value, Icon, color, bg, subtitle }) => (
  <div className="col-6 col-lg-3">
    <div className="erp-card erp-stat-card">
      <div>
        <p className="erp-stat-label">{title}</p>
        <p className="erp-stat-value">{value}</p>
        {subtitle && (
          <small style={{ color: "#6b7280", fontSize: 11 }}>{subtitle}</small>
        )}
      </div>
      <div className="erp-stat-icon" style={{ backgroundColor: bg, color }}>
        <Icon size={22} />
      </div>
    </div>
  </div>
);

const ManagerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    total_employees: 0,
    present_today: 0,
    working_now: 0,
    pending_leaves: 0,
    total_departments: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.getManagerStats();
        setStats(res.data);
      } catch (e) {
        console.error("Failed to load stats:", e);
      } finally {
        setLoading(false);
      }
    };
    load();

    // Auto refresh every 60 seconds
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, []);

  return (
    <Layout>
      <div className="mb-4">
        <h1 className="erp-page-title">Dashboard</h1>
        <p className="erp-page-subtitle mb-0">
          Welcome back, {user?.first_name} {user?.last_name}
        </p>
      </div>

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

      {/* Quick Actions */}
      <div className="erp-card mb-3">
        <h5 style={{ fontWeight: 700, marginBottom: 16 }}>Quick Actions</h5>
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
              <p style={{ margin: 0, fontSize: 13, marginTop: 2 }}>
                Add departments first, then employees. They can then log in
                with their credentials.
              </p>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default ManagerDashboard;