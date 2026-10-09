import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Mail,
  Phone,
  Building2,
  Briefcase,
  Hash,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  TrendingUp,
  FileText,
  ClipboardList,
  CalendarDays,
  User as UserIcon,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import * as api from "../../api/reportApi";

const FONT = "'Calibri', 'Segoe UI', -apple-system, sans-serif";

const COLORS = ["#16a34a", "#dc2626", "#d97706", "#4f46e5"];

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

const getProfilePicUrl = (url) => {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `${url}`;
};

// ============================================
// Small components
// ============================================
const StatBox = ({ label, value, Icon, color, bg }) => (
  <div
    style={{
      padding: 14,
      background: bg,
      borderRadius: 12,
      display: "flex",
      alignItems: "center",
      gap: 12,
      fontFamily: FONT,
    }}
  >
    <div
      style={{
        width: 38,
        height: 38,
        borderRadius: 10,
        background: "rgba(255,255,255,0.7)",
        color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <Icon size={17} strokeWidth={2.4} />
    </div>
    <div style={{ minWidth: 0 }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: "#6b7280",
          textTransform: "uppercase",
          letterSpacing: 0.4,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 20,
          fontWeight: 800,
          color,
          lineHeight: 1.1,
          letterSpacing: "-0.3px",
        }}
      >
        {value}
      </div>
    </div>
  </div>
);

// ============================================
// Main
// ============================================
const EmployeeFullReport = ({ employeeId, onBack }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!employeeId) return;
    setLoading(true);
    api
      .getEmployeeFullReport(employeeId)
      .then((r) => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [employeeId]);

  if (loading) {
    return (
      <div className="text-center py-5" style={{ color: "#9ca3af", fontFamily: FONT }}>
        <div className="spinner-border spinner-border-sm me-2" />
        Loading full report...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-5" style={{ color: "#9ca3af", fontFamily: FONT }}>
        <XCircle size={36} style={{ opacity: 0.4, marginBottom: 8 }} />
        <div>Failed to load report</div>
      </div>
    );
  }

  const { profile, attendance, leaves, tasks, documents } = data;

  const profilePic = getProfilePicUrl(profile.profile_picture_url);

  // Pie chart: attendance breakdown
  const attendancePieData = [
    { name: "Present", value: attendance.all_time.present_days || 0 },
    { name: "Late", value: attendance.all_time.late_days || 0 },
    { name: "Early Out", value: attendance.all_time.early_logout_days || 0 },
  ].filter((d) => d.value > 0);

  // Pie chart: task breakdown
  const taskPieData = [
    { name: "Completed", value: tasks.completed || 0 },
    { name: "In Progress", value: tasks.in_progress || 0 },
    { name: "Pending", value: tasks.pending || 0 },
  ].filter((d) => d.value > 0);

  return (
    <div style={{ fontFamily: FONT }}>
      {/* Back button */}
      <button
        onClick={onBack}
        className="erp-btn erp-btn-outline mb-3"
        style={{ fontFamily: FONT }}
      >
        <ArrowLeft size={14} /> Back to Report
      </button>

      {/* ================================================ */}
      {/* HERO — Employee Profile */}
      {/* ================================================ */}
      <div
        style={{
          padding: 24,
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          borderRadius: 18,
          marginBottom: 20,
          position: "relative",
          overflow: "hidden",
          fontFamily: FONT,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -40,
            right: -40,
            width: 160,
            height: 160,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.08)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -50,
            right: 80,
            width: 100,
            height: 100,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.06)",
          }}
        />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            position: "relative",
            zIndex: 1,
            flexWrap: "wrap",
          }}
        >
          {/* Avatar */}
          {profilePic ? (
            <div
              style={{
                width: 88,
                height: 88,
                borderRadius: 20,
                backgroundImage: `url(${profilePic})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                border: "3px solid rgba(255,255,255,0.5)",
                flexShrink: 0,
                boxShadow: "0 8px 20px rgba(0,0,0,0.15)",
              }}
            />
          ) : (
            <div
              style={{
                width: 88,
                height: 88,
                borderRadius: 20,
                background: "rgba(255,255,255,0.2)",
                backdropFilter: "blur(10px)",
                border: "2px solid rgba(255,255,255,0.4)",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 30,
                fontWeight: 800,
                flexShrink: 0,
                letterSpacing: "-1px",
              }}
            >
              {profile.name?.split(" ").map((n) => n[0]).slice(0, 2).join("")}
            </div>
          )}

          {/* Info */}
          <div style={{ flex: 1, minWidth: 240 }}>
            <div
              style={{
                fontSize: 24,
                fontWeight: 800,
                color: "white",
                letterSpacing: "-0.5px",
                marginBottom: 6,
              }}
            >
              {profile.name}
            </div>

            <div
              style={{
                fontSize: 13.5,
                color: "rgba(255,255,255,0.85)",
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginBottom: 12,
              }}
            >
              <Mail size={13} />
              {profile.email}
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <HeroPill icon={Hash} text={profile.code} />
              {profile.department !== "—" && (
                <HeroPill icon={Building2} text={profile.department} />
              )}
              {profile.designation !== "—" && (
                <HeroPill icon={Briefcase} text={profile.designation} />
              )}
              <HeroPill icon={Phone} text={profile.phone} />
            </div>
          </div>

          {/* Joined + status */}
          <div style={{ textAlign: "right" }}>
            <div
              style={{
                fontSize: 10.5,
                color: "rgba(255,255,255,0.7)",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: 0.5,
                marginBottom: 4,
              }}
            >
              Joined
            </div>
            <div
              style={{
                fontSize: 15,
                color: "white",
                fontWeight: 700,
                marginBottom: 12,
              }}
            >
              {formatDate(profile.joined)}
            </div>
            <div
              style={{
                display: "inline-flex",
                background:
                  profile.status === "ACTIVE"
                    ? "rgba(34,197,94,0.25)"
                    : "rgba(239,68,68,0.25)",
                backdropFilter: "blur(10px)",
                color: "white",
                padding: "5px 14px",
                borderRadius: 20,
                fontSize: 11.5,
                fontWeight: 700,
                border: "1px solid rgba(255,255,255,0.3)",
                alignItems: "center",
                gap: 5,
              }}
            >
              ● {profile.status}
            </div>
          </div>
        </div>
      </div>

      {/* ================================================ */}
      {/* ATTENDANCE */}
      {/* ================================================ */}
      <SectionHeader icon={Clock} title="Attendance" subtitle="Overall + this month" />

      <div className="row g-3 mb-4">
        <div className="col-6 col-md-3">
          <StatBox
            label="Present (Total)"
            value={attendance.all_time.present_days}
            Icon={CheckCircle2}
            color="#15803d"
            bg="#dcfce7"
          />
        </div>
        <div className="col-6 col-md-3">
          <StatBox
            label="Late (Total)"
            value={attendance.all_time.late_days}
            Icon={AlertTriangle}
            color="#b91c1c"
            bg="#fee2e2"
          />
        </div>
        <div className="col-6 col-md-3">
          <StatBox
            label="Early Out"
            value={attendance.all_time.early_logout_days}
            Icon={XCircle}
            color="#b45309"
            bg="#fef3c7"
          />
        </div>
        <div className="col-6 col-md-3">
          <StatBox
            label="Total Hours"
            value={formatHours(attendance.all_time.total_hours)}
            Icon={TrendingUp}
            color="#4f46e5"
            bg="#eef2ff"
          />
        </div>
      </div>

      {/* Attendance chart + recent table */}
      <div className="row g-3 mb-4">
        {attendancePieData.length > 0 && (
          <div className="col-12 col-lg-4">
            <div className="erp-card" style={{ padding: 18, height: "100%" }}>
              <ChartTitle icon={Clock} text="Attendance Breakdown" />
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={attendancePieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    innerRadius={36}
                    paddingAngle={3}
                    label={({ name, percent }) =>
                      `${name} (${(percent * 100).toFixed(0)}%)`
                    }
                    labelLine={false}
                    style={{ fontSize: 10.5, fontFamily: FONT }}
                  >
                    {attendancePieData.map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      fontFamily: FONT,
                      fontSize: 12,
                      borderRadius: 8,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div className={attendancePieData.length > 0 ? "col-12 col-lg-8" : "col-12"}>
          <div className="erp-card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)" }}>
              <ChartTitle icon={FileText} text="Recent Attendance (Last 30 days)" />
            </div>

            {attendance.recent_records.length === 0 ? (
              <EmptyState text="No attendance records" />
            ) : (
              <div style={{ maxHeight: 340, overflowY: "auto" }}>
                <table className="erp-table" style={{ fontFamily: FONT }}>
                  <thead style={{ position: "sticky", top: 0 }}>
                    <tr>
                      <th>Date</th>
                      <th>Check In</th>
                      <th>Check Out</th>
                      <th>Hours</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendance.recent_records.map((a, i) => (
                      <tr key={i}>
                        <td style={{ fontSize: 12.5 }}>{formatDate(a.date)}</td>
                        <td
                          style={{
                            color: a.is_late ? "#dc2626" : "#15803d",
                            fontWeight: 600,
                          }}
                        >
                          {formatTime(a.check_in)}
                          {a.is_late && (
                            <div style={{ fontSize: 10.5 }}>+{a.late_minutes}m</div>
                          )}
                        </td>
                        <td
                          style={{
                            color: a.is_early_logout ? "#d97706" : "#6b7280",
                            fontWeight: 600,
                          }}
                        >
                          {formatTime(a.check_out)}
                          {a.is_early_logout && (
                            <div style={{ fontSize: 10.5 }}>
                              −{a.early_minutes}m
                            </div>
                          )}
                        </td>
                        <td style={{ fontWeight: 600 }}>
                          {formatHours(a.working_hours)}
                        </td>
                        <td>
                          <StatusBadge rec={a} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ================================================ */}
      {/* LEAVES */}
      {/* ================================================ */}
      <SectionHeader
        icon={CalendarDays}
        title="Leaves"
        subtitle="History and usage"
      />

      <div className="row g-3 mb-4">
        <div className="col-6 col-md-3">
          <StatBox
            label="Approved"
            value={leaves.approved}
            Icon={CheckCircle2}
            color="#15803d"
            bg="#dcfce7"
          />
        </div>
        <div className="col-6 col-md-3">
          <StatBox
            label="Pending"
            value={leaves.pending}
            Icon={Clock}
            color="#b45309"
            bg="#fef3c7"
          />
        </div>
        <div className="col-6 col-md-3">
          <StatBox
            label="Rejected"
            value={leaves.rejected}
            Icon={XCircle}
            color="#b91c1c"
            bg="#fee2e2"
          />
        </div>
        <div className="col-6 col-md-3">
          <StatBox
            label="Days Used"
            value={leaves.days_used}
            Icon={TrendingUp}
            color="#4f46e5"
            bg="#eef2ff"
          />
        </div>
      </div>

      {leaves.recent.length > 0 && (
        <div className="erp-card mb-4" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)" }}>
            <ChartTitle icon={FileText} text="Recent Leave Applications" />
          </div>
          <table className="erp-table" style={{ fontFamily: FONT }}>
            <thead>
              <tr>
                <th>Type</th>
                <th>From</th>
                <th>To</th>
                <th>Days</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {leaves.recent.map((l, i) => (
                <tr key={i}>
                  <td>
                    <span className="erp-badge erp-badge-blue">
                      {l.leave_type}
                    </span>
                  </td>
                  <td style={{ fontSize: 12.5 }}>{formatDate(l.start_date)}</td>
                  <td style={{ fontSize: 12.5 }}>{formatDate(l.end_date)}</td>
                  <td>
                    <strong>{l.total_days}d</strong>
                  </td>
                  <td>
                    <span
                      className={
                        l.status === "Approved"
                          ? "erp-badge erp-badge-green"
                          : l.status === "Pending"
                          ? "erp-badge erp-badge-yellow"
                          : "erp-badge erp-badge-red"
                      }
                    >
                      ● {l.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ================================================ */}
      {/* TASKS */}
      {/* ================================================ */}
      <SectionHeader
        icon={ClipboardList}
        title="Tasks"
        subtitle="Assignment summary"
      />

      <div className="row g-3 mb-4">
        <div className="col-6 col-md-3">
          <StatBox
            label="Completed"
            value={tasks.completed}
            Icon={CheckCircle2}
            color="#15803d"
            bg="#dcfce7"
          />
        </div>
        <div className="col-6 col-md-3">
          <StatBox
            label="In Progress"
            value={tasks.in_progress}
            Icon={Clock}
            color="#1e40af"
            bg="#dbeafe"
          />
        </div>
        <div className="col-6 col-md-3">
          <StatBox
            label="Pending"
            value={tasks.pending}
            Icon={Clock}
            color="#b45309"
            bg="#fef3c7"
          />
        </div>
        <div className="col-6 col-md-3">
          <StatBox
            label="Overdue"
            value={tasks.overdue}
            Icon={AlertTriangle}
            color="#b91c1c"
            bg="#fee2e2"
          />
        </div>
      </div>

      <div className="row g-3 mb-4">
        {taskPieData.length > 0 && (
          <div className="col-12 col-lg-4">
            <div className="erp-card" style={{ padding: 18, height: "100%" }}>
              <ChartTitle icon={ClipboardList} text="Task Status" />
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={taskPieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    innerRadius={36}
                    paddingAngle={3}
                    label={({ name, percent }) =>
                      `${name} (${(percent * 100).toFixed(0)}%)`
                    }
                    labelLine={false}
                    style={{ fontSize: 10.5, fontFamily: FONT }}
                  >
                    {taskPieData.map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      fontFamily: FONT,
                      fontSize: 12,
                      borderRadius: 8,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div className={taskPieData.length > 0 ? "col-12 col-lg-8" : "col-12"}>
          <div className="erp-card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)" }}>
              <ChartTitle icon={FileText} text="Recent Tasks" />
            </div>

            {tasks.recent.length === 0 ? (
              <EmptyState text="No tasks assigned" />
            ) : (
              <table className="erp-table" style={{ fontFamily: FONT }}>
                <thead>
                  <tr>
                    <th>Task</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Due</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.recent.map((t, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600, fontSize: 12.5 }}>
                        {t.title}
                      </td>
                      <td>
                        <span
                          className="erp-badge"
                          style={{
                            background:
                              t.priority === "URGENT"
                                ? "#fee2e2"
                                : t.priority === "HIGH"
                                ? "#fef3c7"
                                : "#eef2ff",
                            color:
                              t.priority === "URGENT"
                                ? "#991b1b"
                                : t.priority === "HIGH"
                                ? "#92400e"
                                : "#4338ca",
                          }}
                        >
                          {t.priority}
                        </span>
                      </td>
                      <td>
                        <span
                          className={
                            t.status === "Completed"
                              ? "erp-badge erp-badge-green"
                              : t.status === "In Progress"
                              ? "erp-badge erp-badge-blue"
                              : "erp-badge erp-badge-yellow"
                          }
                        >
                          ● {t.status}
                        </span>
                      </td>
                      <td style={{ fontSize: 12.5 }}>{formatDate(t.due_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* ================================================ */}
      {/* DOCUMENTS */}
      {/* ================================================ */}
      <SectionHeader icon={FileText} title="Documents" subtitle="Files uploaded" />

      <div className="row g-3 mb-4">
        <div className="col-12 col-md-4">
          <StatBox
            label="Total Documents"
            value={documents.count}
            Icon={FileText}
            color="#4f46e5"
            bg="#eef2ff"
          />
        </div>
      </div>
    </div>
  );
};

// ============================================
// Sub-components
// ============================================
const HeroPill = ({ icon: Icon, text }) => (
  <span
    style={{
      background: "rgba(255,255,255,0.22)",
      backdropFilter: "blur(10px)",
      color: "white",
      padding: "4px 11px",
      borderRadius: 20,
      fontSize: 11,
      fontWeight: 700,
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      border: "1px solid rgba(255,255,255,0.25)",
    }}
  >
    <Icon size={10} strokeWidth={2.5} />
    {text}
  </span>
);

const SectionHeader = ({ icon: Icon, title, subtitle }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 10,
      marginBottom: 14,
      marginTop: 8,
      fontFamily: FONT,
    }}
  >
    <div
      style={{
        width: 32,
        height: 32,
        borderRadius: 8,
        background: "#eef2ff",
        color: "#4f46e5",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Icon size={15} strokeWidth={2.4} />
    </div>
    <div>
      <div style={{ fontWeight: 700, fontSize: 15 }}>{title}</div>
      <div style={{ fontSize: 11.5, color: "#6b7280" }}>{subtitle}</div>
    </div>
  </div>
);

const ChartTitle = ({ icon: Icon, text }) => (
  <div
    style={{
      fontSize: 11,
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
    <Icon size={12} strokeWidth={2.5} color="#4f46e5" />
    {text}
  </div>
);

const EmptyState = ({ text }) => (
  <div
    className="text-center py-5"
    style={{ color: "#9ca3af", fontSize: 13, fontFamily: FONT }}
  >
    <UserIcon
      size={32}
      style={{ display: "block", margin: "0 auto 8px", opacity: 0.3 }}
    />
    {text}
  </div>
);

const StatusBadge = ({ rec }) => {
  let cls = "erp-badge erp-badge-green";
  let text = "Present";

  if (rec.is_late && rec.is_early_logout) {
    cls = "erp-badge erp-badge-red";
    text = "Late + Early";
  } else if (rec.is_late) {
    cls = "erp-badge erp-badge-red";
    text = "Late";
  } else if (rec.is_early_logout) {
    cls = "erp-badge erp-badge-yellow";
    text = "Early";
  } else if (rec.status === "HALF_DAY") {
    cls = "erp-badge erp-badge-yellow";
    text = "Half Day";
  }

  return <span className={cls}>{text}</span>;
};

export default EmployeeFullReport;