import { getFullFileUrl } from '../../utils/apiUrl';
import { useState, useEffect } from "react";
import {
  Mail,
  Phone,
  Building2,
  Hash,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  TrendingUp,
  LogIn,
  LogOut,
  FileText,
  Briefcase,
  Clock,
} from "lucide-react";
import Modal from "../common/Modal";
import AttendanceCalendar from "./AttendanceCalendar";
import * as api from "../../api/attendanceApi";

// ============================================
// Helpers
// ============================================
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
// Build full profile picture URL
const getProfilePicUrl = (url) => getFullFileUrl(url);

const formatHours = (h) => {
  if (!h || h <= 0) return "0h";
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  if (hrs === 0) return `${mins}m`;
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
};

const formatDateLong = (dateStr) => {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
};

const formatDateShort = (dateStr) => {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
};

// ============================================
// Sub-components
// ============================================

const StatBox = ({ label, value, Icon, color, bg, border }) => (
  <div
    style={{
      padding: "14px 14px",
      background: bg,
      border: `1px solid ${border || "transparent"}`,
      borderRadius: 12,
      flex: 1,
      minWidth: 100,
      display: "flex",
      flexDirection: "column",
      gap: 8,
      transition: "all 0.2s ease",
    }}
  >
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 5,
        fontSize: 10.5,
        fontWeight: 700,
        color: "#6b7280",
        textTransform: "uppercase",
        letterSpacing: 0.5,
      }}
    >
      <Icon size={12} color={color} strokeWidth={2.5} />
      {label}
    </div>
    <div
      style={{
        fontSize: 24,
        fontWeight: 800,
        color,
        lineHeight: 1,
        letterSpacing: "-0.5px",
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {value}
    </div>
  </div>
);

const InfoTile = ({ Icon, label, value }) => (
  <div
    style={{
      padding: "12px 14px",
      background: "white",
      borderRadius: 12,
      border: "1px solid #e5e7eb",
      display: "flex",
      alignItems: "center",
      gap: 12,
      transition: "all 0.2s ease",
    }}
  >
    <div
      style={{
        width: 36,
        height: 36,
        borderRadius: 10,
        background: "#f3f4f6",
        color: "#6b7280",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <Icon size={16} strokeWidth={2.2} />
    </div>
    <div style={{ minWidth: 0, flex: 1 }}>
      <div
        style={{
          color: "#9ca3af",
          fontSize: 10.5,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: 0.5,
          marginBottom: 2,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontWeight: 600,
          fontSize: 13.5,
          color: "#111827",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {value || "—"}
      </div>
    </div>
  </div>
);

const getStatusInfo = (rec) => {
  if (!rec) return { label: "Absent", color: "#6b7280", bg: "#f3f4f6", Icon: XCircle };
  if (rec.is_late && rec.is_early_logout)
    return {
      label: "Late + Early",
      color: "#b91c1c",
      bg: "#fee2e2",
      Icon: AlertTriangle,
    };
  if (rec.is_late)
    return {
      label: "Late Check-In",
      color: "#b91c1c",
      bg: "#fee2e2",
      Icon: AlertTriangle,
    };
  if (rec.is_early_logout)
    return {
      label: "Early Logout",
      color: "#b45309",
      bg: "#fef3c7",
      Icon: Clock,
    };
  if (rec.status === "HALF_DAY")
    return {
      label: "Half Day",
      color: "#c2410c",
      bg: "#ffedd5",
      Icon: Clock,
    };
  return {
    label: "Present",
    color: "#15803d",
    bg: "#dcfce7",
    Icon: CheckCircle2,
  };
};

// ============================================
// Main Component
// ============================================

const EmployeeDetailsModal = ({ open, employee, onClose }) => {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    if (!open || !employee) return;
    setSelectedDate(null);
    const loadReport = async () => {
      setLoading(true);
      try {
        const res = await api.getEmployeeMonthlyReport(
          employee.employee_id || employee._id,
          year,
          month
        );
        setReport(res.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadReport();
  }, [open, employee, year, month]);

  const prevMonth = () => {
    setSelectedDate(null);
    if (month === 1) {
      setMonth(12);
      setYear(year - 1);
    } else setMonth(month - 1);
  };

  const nextMonth = () => {
    setSelectedDate(null);
    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
    } else setMonth(month + 1);
  };

  const canGoNext = () => {
    const today = new Date();
    return (
      year < today.getFullYear() ||
      (year === today.getFullYear() && month < today.getMonth() + 1)
    );
  };

  const summary = report?.summary || {};
  const records = report?.records || [];
  const selectedRecord = selectedDate?.record;
  const statusInfo = selectedRecord ? getStatusInfo(selectedRecord) : null;
  const StatusIcon = statusInfo?.Icon;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Employee Details"
      footer={
        <button className="erp-btn erp-btn-outline" onClick={onClose}>
          Close
        </button>
      }
    >
      {employee && (
        <div style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}>
          {/* ============================== */}
          {/* Hero Profile Card */}
          {/* ============================== */}
          <div
            style={{
              position: "relative",
              padding: 20,
              background:
                "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              borderRadius: 16,
              marginBottom: 20,
              overflow: "hidden",
              boxShadow: "0 8px 24px -8px rgba(102,126,234,0.5)",
            }}
          >
            {/* Decorative circles */}
            <div
              style={{
                position: "absolute",
                top: -30,
                right: -30,
                width: 120,
                height: 120,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.08)",
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: -40,
                right: 40,
                width: 80,
                height: 80,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.06)",
              }}
            />

            <div
              style={{
                position: "relative",
                zIndex: 1,
                display: "flex",
                alignItems: "center",
                gap: 16,
              }}
            >
              {employee.profile_picture_url ? (
  <div
    style={{
      width: 64,
      height: 64,
      borderRadius: 18,
      backgroundImage: `url(${getProfilePicUrl(
        employee.profile_picture_url
      )})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      border: "3px solid rgba(255,255,255,0.5)",
      flexShrink: 0,
      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
    }}
  />
) : (
  <div
    style={{
      width: 64,
      height: 64,
      borderRadius: 18,
      background: "rgba(255,255,255,0.2)",
      backdropFilter: "blur(10px)",
      border: "2px solid rgba(255,255,255,0.3)",
      color: "white",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 24,
      fontWeight: 800,
      flexShrink: 0,
      letterSpacing: "-0.5px",
    }}
  >
    {employee.first_name?.[0]}
    {employee.last_name?.[0]}
  </div>
)}

              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: 800,
                    fontSize: 19,
                    color: "white",
                    letterSpacing: "-0.4px",
                    marginBottom: 4,
                    lineHeight: 1.2,
                  }}
                >
                  {employee.first_name} {employee.last_name}
                </div>

                <div
                  style={{
                    fontSize: 12.5,
                    color: "rgba(255,255,255,0.85)",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    marginBottom: 10,
                  }}
                >
                  <Mail size={12} strokeWidth={2.2} />
                  {employee.email}
                </div>

                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <span
                    style={{
                      background: "rgba(255,255,255,0.22)",
                      backdropFilter: "blur(10px)",
                      color: "white",
                      padding: "3px 10px",
                      borderRadius: 20,
                      fontSize: 11,
                      fontWeight: 700,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      border: "1px solid rgba(255,255,255,0.2)",
                    }}
                  >
                    <Hash size={10} strokeWidth={2.5} />
                    {employee.employee_code}
                  </span>
                  {employee.department_name && (
                    <span
                      style={{
                        background: "rgba(255,255,255,0.22)",
                        backdropFilter: "blur(10px)",
                        color: "white",
                        padding: "3px 10px",
                        borderRadius: 20,
                        fontSize: 11,
                        fontWeight: 700,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        border: "1px solid rgba(255,255,255,0.2)",
                      }}
                    >
                      <Building2 size={10} strokeWidth={2.5} />
                      {employee.department_name}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ============================== */}
          {/* Contact Info Tiles */}
          {/* ============================== */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
              marginBottom: 20,
            }}
          >
            <InfoTile
              Icon={Phone}
              label="Phone"
              value={employee.phone}
            />
            <InfoTile
              Icon={Calendar}
              label="Joined"
              value={
                employee.date_of_joining
                  ? formatDateShort(employee.date_of_joining)
                  : "—"
              }
            />
          </div>

          {/* ============================== */}
          {/* Summary Section */}
          {/* ============================== */}
          <div style={{ marginBottom: 20 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: "#374151",
                  textTransform: "uppercase",
                  letterSpacing: 0.6,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <TrendingUp size={13} strokeWidth={2.5} color="#4f46e5" />
                This Month's Summary
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "#9ca3af",
                  fontWeight: 600,
                }}
              >
                {new Date(year, month - 1).toLocaleDateString("en-IN", {
                  month: "short",
                  year: "numeric",
                })}
              </div>
            </div>

            {loading ? (
              <div
                style={{
                  padding: 40,
                  textAlign: "center",
                  color: "#9ca3af",
                  fontSize: 13,
                }}
              >
                <div className="spinner-border spinner-border-sm me-2" />
                Loading summary...
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: 8,
                }}
              >
                <StatBox
                  label="Present"
                  value={summary.present_days || 0}
                  Icon={CheckCircle2}
                  color="#15803d"
                  bg="#f0fdf4"
                  border="#bbf7d0"
                />
                <StatBox
                  label="Late"
                  value={summary.late_days || 0}
                  Icon={AlertTriangle}
                  color="#b91c1c"
                  bg="#fef2f2"
                  border="#fecaca"
                />
                <StatBox
                  label="Early"
                  value={summary.early_logout_days || 0}
                  Icon={Clock}
                  color="#b45309"
                  bg="#fffbeb"
                  border="#fde68a"
                />
                <StatBox
                  label="Hours"
                  value={formatHours(summary.total_hours)}
                  Icon={TrendingUp}
                  color="#4f46e5"
                  bg="#eef2ff"
                  border="#c7d2fe"
                />
              </div>
            )}
          </div>

          {/* ============================== */}
          {/* Calendar */}
          {/* ============================== */}
          <div
            style={{
              padding: 20,
              background: "white",
              border: "1px solid #e5e7eb",
              borderRadius: 16,
              marginBottom: 16,
              boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: "#374151",
                textTransform: "uppercase",
                letterSpacing: 0.6,
                marginBottom: 16,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Calendar size={13} strokeWidth={2.5} color="#4f46e5" />
              Attendance Calendar
              <span
                style={{
                  marginLeft: "auto",
                  fontSize: 10,
                  fontWeight: 500,
                  color: "#9ca3af",
                  textTransform: "none",
                  letterSpacing: 0,
                }}
              >
                Click a day to view details
              </span>
            </div>

            {loading ? (
              <div
                className="text-center py-5"
                style={{ color: "#9ca3af", fontSize: 13 }}
              >
                <div className="spinner-border spinner-border-sm me-2" />
                Loading calendar...
              </div>
            ) : (
              <AttendanceCalendar
                year={year}
                month={month}
                records={records}
                onPrev={prevMonth}
                onNext={nextMonth}
                canGoNext={canGoNext()}
                selectedDate={selectedDate?.dateStr}
                onDateClick={(cell) => setSelectedDate(cell)}
              />
            )}
          </div>

          {/* ============================== */}
          {/* Selected Date Details */}
          {/* ============================== */}
          {selectedDate && selectedRecord && (
            <div
              style={{
                padding: 18,
                background: "#fafafa",
                border: "1px solid #e5e7eb",
                borderRadius: 16,
                animation: "slideDown 0.25s ease",
              }}
            >
              {/* Header */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 16,
                  flexWrap: "wrap",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    fontSize: 13.5,
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    color: "#111827",
                  }}
                >
                  <Calendar size={15} color="#4f46e5" strokeWidth={2.5} />
                  {formatDateLong(selectedDate.dateStr)}
                </div>

                {statusInfo && (
                  <span
                    style={{
                      background: statusInfo.bg,
                      color: statusInfo.color,
                      padding: "5px 12px",
                      borderRadius: 20,
                      fontSize: 11.5,
                      fontWeight: 700,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      border: `1px solid ${statusInfo.color}25`,
                    }}
                  >
                    <StatusIcon size={11} strokeWidth={2.5} />
                    {statusInfo.label}
                  </span>
                )}
              </div>

              {/* Time cards */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 10,
                }}
              >
                {/* Check In */}
                <div
                  style={{
                    padding: 14,
                    background: "white",
                    borderRadius: 12,
                    border: `1px solid ${
                      selectedRecord.is_late ? "#fecaca" : "#e5e7eb"
                    }`,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      fontSize: 10.5,
                      fontWeight: 700,
                      color: "#9ca3af",
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                      marginBottom: 8,
                    }}
                  >
                    <LogIn size={11} strokeWidth={2.5} />
                    Check In
                  </div>
                  <div
                    style={{
                      fontSize: 17,
                      fontWeight: 800,
                      color: selectedRecord.is_late ? "#b91c1c" : "#15803d",
                      fontVariantNumeric: "tabular-nums",
                      letterSpacing: "-0.3px",
                    }}
                  >
                    {formatTime(selectedRecord.check_in)}
                  </div>
                  {selectedRecord.is_late && (
                    <div
                      style={{
                        fontSize: 10.5,
                        color: "#b91c1c",
                        fontWeight: 700,
                        marginTop: 5,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 3,
                        background: "#fef2f2",
                        padding: "2px 7px",
                        borderRadius: 6,
                      }}
                    >
                      <AlertTriangle size={9} strokeWidth={2.5} />
                      Late {selectedRecord.late_minutes}m
                    </div>
                  )}
                </div>

                {/* Check Out */}
                <div
                  style={{
                    padding: 14,
                    background: "white",
                    borderRadius: 12,
                    border: `1px solid ${
                      selectedRecord.is_early_logout ? "#fecaca" : "#e5e7eb"
                    }`,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      fontSize: 10.5,
                      fontWeight: 700,
                      color: "#9ca3af",
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                      marginBottom: 8,
                    }}
                  >
                    <LogOut size={11} strokeWidth={2.5} />
                    Check Out
                  </div>
                  <div
                    style={{
                      fontSize: 17,
                      fontWeight: 800,
                      color: selectedRecord.is_early_logout
                        ? "#b91c1c"
                        : "#d97706",
                      fontVariantNumeric: "tabular-nums",
                      letterSpacing: "-0.3px",
                    }}
                  >
                    {formatTime(selectedRecord.check_out)}
                  </div>
                  {selectedRecord.is_early_logout && (
                    <div
                      style={{
                        fontSize: 10.5,
                        color: "#b91c1c",
                        fontWeight: 700,
                        marginTop: 5,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 3,
                        background: "#fef2f2",
                        padding: "2px 7px",
                        borderRadius: 6,
                      }}
                    >
                      <AlertTriangle size={9} strokeWidth={2.5} />
                      Early {selectedRecord.early_minutes}m
                    </div>
                  )}
                </div>

                {/* Worked */}
                <div
                  style={{
                    padding: 14,
                    background: "white",
                    borderRadius: 12,
                    border: "1px solid #e5e7eb",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      fontSize: 10.5,
                      fontWeight: 700,
                      color: "#9ca3af",
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                      marginBottom: 8,
                    }}
                  >
                    <TrendingUp size={11} strokeWidth={2.5} />
                    Worked
                  </div>
                  <div
                    style={{
                      fontSize: 17,
                      fontWeight: 800,
                      color: "#4f46e5",
                      fontVariantNumeric: "tabular-nums",
                      letterSpacing: "-0.3px",
                    }}
                  >
                    {formatHours(selectedRecord.working_hours)}
                  </div>
                </div>
              </div>

              {/* Early logout reason */}
              {selectedRecord.early_logout_reason && (
                <div
                  style={{
                    marginTop: 12,
                    padding: "12px 14px",
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    borderRadius: 10,
                    fontSize: 12.5,
                    color: "#991b1b",
                    display: "flex",
                    gap: 10,
                    alignItems: "flex-start",
                  }}
                >
                  <FileText
                    size={14}
                    strokeWidth={2.5}
                    style={{ flexShrink: 0, marginTop: 1 }}
                  />
                  <div>
                    <strong style={{ fontWeight: 700 }}>
                      Early logout reason:
                    </strong>{" "}
                    <span style={{ fontStyle: "italic" }}>
                      {selectedRecord.early_logout_reason}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};

export default EmployeeDetailsModal;