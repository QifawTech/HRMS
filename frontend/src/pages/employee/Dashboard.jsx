import { useState, useEffect, useCallback } from "react";
import {
  Clock,
  LogIn,
  LogOut,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Send,
} from "lucide-react";
import Layout from "../../components/layout/Layout";
import Modal from "../../components/common/Modal";
import Toast from "../../components/common/Toast";
import { useAuth } from "../../hooks/useAuth";
import * as api from "../../api/attendanceApi";
import * as settingsApi from "../../api/settingsApi";
import * as empApi from "../../api/employeeApi";
import * as flApi from "../../api/forgotLogoutApi";

const FONT = "'Calibri', 'Segoe UI', -apple-system, sans-serif";

// ============================================
// LIVE TIMER — Continuous, never auto-stops
// ============================================
const LiveTimer = ({ startTime, isOvernight, sessionDate }) => {
  const [elapsed, setElapsed] = useState("00:00:00");

  useEffect(() => {
    if (!startTime) return;
    const tick = () => {
      const start = new Date(startTime);
      const now = new Date();
      const diff = Math.max(0, now - start);
      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff / (1000 * 60)) % 60);
      const s = Math.floor((diff / 1000) % 60);
      setElapsed(
        `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
      );
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [startTime]);

  const formattedDate = sessionDate
    ? new Date(sessionDate).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "";

  return (
    <div
      style={{
        padding: "16px 20px",
        borderRadius: 10,
        background: isOvernight
          ? "linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)"
          : "linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)",
        border: `1px solid ${isOvernight ? "#fecaca" : "#c7d2fe"}`,
        textAlign: "center",
        marginTop: 14,
        fontFamily: FONT,
      }}
    >
      <div
        style={{
          fontSize: 10.5,
          color: isOvernight ? "#dc2626" : "#4338ca",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: 0.7,
          marginBottom: 6,
        }}
      >
        {isOvernight
          ? `⚠ Still Running — Since ${formattedDate}`
          : "⏱ Working Time"}
      </div>
      <div
        style={{
          fontSize: 32,
          fontWeight: 800,
          color: isOvernight ? "#dc2626" : "#4f46e5",
          fontVariantNumeric: "tabular-nums",
          letterSpacing: "1.5px",
          fontFamily: FONT,
        }}
      >
        {elapsed}
      </div>
      {isOvernight && (
        <div
          style={{
            fontSize: 11,
            color: "#991b1b",
            marginTop: 6,
            fontWeight: 600,
          }}
        >
          You forgot to logout. Click "Check Out" to end this session.
        </div>
      )}
    </div>
  );
};

// ============================================
// FORMAT HELPERS
// ============================================
const formatHours = (hours) => {
  if (!hours || hours <= 0) return "0h 0m";
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${m}m`;
};

const formatMinutes = (mins) => {
  if (!mins || mins <= 0) return "0m";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
};

// Format ISO timestamp → "10:30 AM" (uppercase AM/PM)
const formatTimeShort = (iso) => {
  if (!iso) return "—";
  const t = new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  return t.toUpperCase();
};

// Format "09:30" → "09:30 AM"
const formatTime12 = (t) => {
  if (!t) return "—";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ampm}`;
};

// Format date → "04 Oct 2026"
const formatDateShort = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

// ============================================
// MAIN COMPONENT
// ============================================
const EmployeeDashboard = () => {
  const { user } = useAuth();
  const [today, setToday] = useState(null);
  const [company, setCompany] = useState(null);
  const [myProfile, setMyProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);

  const [earlyModal, setEarlyModal] = useState(false);
  const [earlyReason, setEarlyReason] = useState("");
  const [earlyMinutes, setEarlyMinutes] = useState(0);

  const [blockedInfo, setBlockedInfo] = useState(null);
  const [forgotModal, setForgotModal] = useState(false);
  const [forgotReason, setForgotReason] = useState("");
  const [forgotSending, setForgotSending] = useState(false);
  const [myUsage, setMyUsage] = useState(null);

  useEffect(() => {
    settingsApi
      .getCompanySettings()
      .then((res) => setCompany(res.data))
      .catch(() => {});
    empApi
      .getMyProfile()
      .then((res) => setMyProfile(res.data))
      .catch(() => {});
    flApi
      .getMyUsage()
      .then((res) => setMyUsage(res.data))
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await api.getTodayStatus();
      setToday(res.data);
    } catch (e) {
      setToast({
        message: e.response?.data?.error || "Failed to load status",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  // ============================================
  // SHIFT-AWARE TIME CHECKS
  // ============================================
  const getShiftEndTimeStr = () => {
    if (myProfile?.shift_end) return myProfile.shift_end;
    if (company?.work_end_time) return company.work_end_time;
    return null;
  };

  const getShiftStartTimeStr = () => {
    if (myProfile?.shift_start) return myProfile.shift_start;
    if (company?.work_start_time) return company.work_start_time;
    return "09:30";
  };

  const isBeforeWorkEnd = () => {
    const endTimeStr = getShiftEndTimeStr();
    if (!endTimeStr) return false;

    const [eh, em] = endTimeStr.split(":").map(Number);
    const now = new Date();
    const endTime = new Date();
    endTime.setHours(eh, em, 0, 0);

    const [sh, sm] = getShiftStartTimeStr().split(":").map(Number);

    if (eh < sh || (eh === sh && em < sm)) {
      if (now.getHours() < 12) {
        return now < endTime;
      } else {
        return false;
      }
    }

    return now < endTime;
  };

  const calculateEarlyMinutes = () => {
    const endTimeStr = getShiftEndTimeStr();
    if (!endTimeStr) return 0;

    const [eh, em] = endTimeStr.split(":").map(Number);
    const now = new Date();
    const endTime = new Date();
    endTime.setHours(eh, em, 0, 0);

    const [sh, sm] = getShiftStartTimeStr().split(":").map(Number);

    if (eh < sh || (eh === sh && em < sm)) {
      if (now.getHours() >= 12) {
        endTime.setDate(endTime.getDate() + 1);
      }
    }

    const diff = endTime - now;
    return Math.max(0, Math.floor(diff / (1000 * 60)));
  };

  // ============================================
  // HANDLERS
  // ============================================
  const handleCheckIn = async () => {
    setBusy(true);
    try {
      const res = await api.checkIn();
      const msg = res.data.is_late
        ? `Checked in — Late by ${formatMinutes(res.data.late_minutes)}`
        : "Checked in on time!";
      setToast({
        message: msg,
        type: res.data.is_late ? "error" : "success",
      });
      load();
    } catch (err) {
      const errMsg = err.response?.data?.error || "Failed";
      if (errMsg.startsWith("FORGOT_LOGOUT|")) {
        const parts = errMsg.split("|");
        setBlockedInfo({
          date: parts[1],
          count: parseInt(parts[2]) || 1,
        });
        setForgotModal(true);
      } else if (errMsg.startsWith("OPEN_SESSION|")) {
        const parts = errMsg.split("|");
        setToast({
          message: `You have an open session from ${formatDateShort(parts[1])}. Please check out first.`,
          type: "error",
        });
        load();
      } else {
        setToast({ message: errMsg, type: "error" });
      }
    } finally {
      setBusy(false);
    }
  };

  const submitForgotLogout = async () => {
    if (!forgotReason.trim() || forgotReason.length < 10) {
      setToast({
        message: "Please provide a detailed reason (min 10 characters)",
        type: "error",
      });
      return;
    }
    setForgotSending(true);
    try {
      await flApi.sendForgotLogoutRequest(forgotReason);
      setToast({ message: "Request sent to manager", type: "success" });
      setForgotModal(false);
      setForgotReason("");
      setBlockedInfo(null);
    } catch (err) {
      setToast({
        message: err.response?.data?.error || "Failed",
        type: "error",
      });
    } finally {
      setForgotSending(false);
    }
  };

  const handleCheckOut = async () => {
    // If past open session → checkout directly (no early reason)
    if (openSession && openSession.is_overnight) {
      await submitCheckOut(null);
      return;
    }

    // Today's session → check for early
    if (isBeforeWorkEnd()) {
      setEarlyMinutes(calculateEarlyMinutes());
      setEarlyModal(true);
      return;
    }
    await submitCheckOut(null);
  };

  const submitCheckOut = async (early_reason) => {
    setBusy(true);
    try {
      const res = await api.checkOut(early_reason);
      let msg;
      if (res.data.is_forgotten) {
        msg = `Session closed. Total working time: ${formatHours(res.data.working_hours)}`;
      } else if (res.data.is_early) {
        msg = `Early logout by ${formatMinutes(res.data.early_minutes)}. Worked ${formatHours(res.data.working_hours)}`;
      } else {
        msg = `Checked out — Worked ${formatHours(res.data.working_hours)}`;
      }
      setToast({
        message: msg,
        type: res.data.is_early ? "error" : "success",
      });
      setEarlyModal(false);
      setEarlyReason("");
      setEarlyMinutes(0);
      load();
    } catch (err) {
      setToast({
        message: err.response?.data?.error || "Failed",
        type: "error",
      });
    } finally {
      setBusy(false);
    }
  };

  // ============================================
  // STATE
  // ============================================
  const hasCheckedIn = today?.checked_in;
  const hasCheckedOut = today?.checked_out;
  const isLate = today?.is_late;
  const isEarly = today?.is_early_logout;
  const notMarked = !hasCheckedIn && !hasCheckedOut;

  const openSession = today?.open_session;
  const hasOpenSession = today?.has_open_session;

  const hasShift =
    myProfile?.shift_name && myProfile?.shift_start && myProfile?.shift_end;

  const shiftName = hasShift ? myProfile.shift_name : "Default Shift";
  const shiftStartText = hasShift
    ? formatTime12(myProfile.shift_start)
    : company
    ? formatTime12(company.work_start_time)
    : "09:30 AM";
  const shiftEndText = hasShift
    ? formatTime12(myProfile.shift_end)
    : company
    ? formatTime12(company.work_end_time)
    : "05:30 PM";

  const todayDate = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  // ============================================
  // BUTTON RENDER LOGIC
  // ============================================
  const renderActionButton = () => {
    if (loading) {
      return (
        <button className="erp-btn erp-btn-outline w-100" disabled>
          <span className="spinner-border spinner-border-sm me-2" />
          Loading...
        </button>
      );
    }

    // Open session exists (today or past) → CHECK OUT
    if (hasOpenSession && openSession) {
      const isPast = openSession.is_overnight;
      return (
        <button
          className="erp-btn erp-btn-danger w-100 justify-content-center"
          onClick={handleCheckOut}
          disabled={busy}
          style={{ padding: "12px", fontFamily: FONT, fontWeight: 700 }}
        >
          <LogOut size={16} />
          {busy
            ? "Checking out..."
            : isPast
            ? `Check Out (from ${formatDateShort(openSession.date)})`
            : "Check Out"}
        </button>
      );
    }

    // No open session, not marked today → CHECK IN
    if (notMarked) {
      return (
        <button
          className="erp-btn erp-btn-primary w-100 justify-content-center"
          onClick={handleCheckIn}
          disabled={busy}
          style={{ padding: "12px", fontFamily: FONT, fontWeight: 700 }}
        >
          <LogIn size={16} />
          {busy ? "Checking in..." : "Check In"}
        </button>
      );
    }

    // Today completed
    return (
      <div
        style={{
          padding: 14,
          background: "#ecfdf5",
          borderRadius: 10,
          textAlign: "center",
          color: "#065f46",
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          border: "1px solid #a7f3d0",
        }}
      >
        <CheckCircle2 size={18} />
        Day completed
      </div>
    );
  };

  return (
    <Layout>
      <div style={{ fontFamily: FONT }}>
        <div className="mb-4">
          <h1 className="erp-page-title">Dashboard</h1>
          <p className="erp-page-subtitle mb-0">
            Welcome back, <strong>{user?.first_name} {user?.last_name}</strong>
          </p>
        </div>

        <div className="row g-3">
          {/* Attendance Card */}
          <div className="col-12 col-lg-6">
            <div className="erp-card h-100" style={{ fontFamily: FONT }}>
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div className="d-flex align-items-center gap-2">
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: "#eef2ff",
                      color: "#4f46e5",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Clock size={18} />
                  </div>
                  <div>
                    <h5 style={{ fontWeight: 700, margin: 0, fontSize: 15 }}>
                      Today's Attendance
                    </h5>
                    <div
                      style={{ fontSize: 11.5, color: "#94a3b8", marginTop: 1 }}
                    >
                      {todayDate}
                    </div>
                  </div>
                </div>
              </div>

              {/* Shift banner */}
              <div
                style={{
                  padding: "16px 18px",
                  borderRadius: 12,
                  background:
                    "linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)",
                  border: "1px solid #c7d2fe",
                  textAlign: "center",
                  marginBottom: 8,
                }}
              >
                <div
                  style={{
                    fontSize: 10.5,
                    color: "#4338ca",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: 0.7,
                    marginBottom: 6,
                  }}
                >
                  Your Shift
                </div>
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 800,
                    color: "#1e1b4b",
                    letterSpacing: "-0.3px",
                    marginBottom: 4,
                  }}
                >
                  {shiftName}
                </div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: "#4f46e5",
                    fontVariantNumeric: "tabular-nums",
                    letterSpacing: "0.3px",
                  }}
                >
                  {shiftStartText} — {shiftEndText}
                </div>
              </div>

              {/* CONTINUOUS TIMER */}
              {hasOpenSession && openSession && (
                <LiveTimer
                  startTime={openSession.check_in}
                  isOvernight={openSession.is_overnight}
                  sessionDate={openSession.date}
                />
              )}

              {/* Check In / Check Out display */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                  marginTop: 20,
                  marginBottom: 16,
                }}
              >
                {/* CHECK IN BOX */}
                <div
                  style={{
                    padding: 14,
                    borderRadius: 10,
                    background: hasCheckedIn
                      ? isLate
                        ? "#fef2f2"
                        : "#ecfdf5"
                      : "#f9fafb",
                    textAlign: "center",
                    border: hasCheckedIn
                      ? `1px solid ${isLate ? "#fecaca" : "#a7f3d0"}`
                      : "1px solid #e5e7eb",
                  }}
                >
                  <div
                    style={{
                      fontSize: 10.5,
                      color: "#6b7280",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    Check In
                  </div>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 800,
                      color: hasCheckedIn
                        ? isLate
                          ? "#dc2626"
                          : "#059669"
                        : "#9ca3af",
                      marginTop: 6,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {hasCheckedIn ? formatTimeShort(today.check_in) : "—"}
                  </div>
                  {hasCheckedIn && (
                    <div
                      style={{
                        fontSize: 11,
                        marginTop: 4,
                        color: isLate ? "#dc2626" : "#059669",
                        fontWeight: 700,
                      }}
                    >
                      {isLate
                        ? `⚠ Late ${formatMinutes(today.late_minutes)}`
                        : "✓ On Time"}
                    </div>
                  )}
                </div>

                {/* CHECK OUT BOX */}
                <div
                  style={{
                    padding: 14,
                    borderRadius: 10,
                    background: hasCheckedOut
                      ? isEarly
                        ? "#fef2f2"
                        : "#fef3c7"
                      : "#f9fafb",
                    textAlign: "center",
                    border: hasCheckedOut
                      ? `1px solid ${isEarly ? "#fecaca" : "#fde68a"}`
                      : "1px solid #e5e7eb",
                  }}
                >
                  <div
                    style={{
                      fontSize: 10.5,
                      color: "#6b7280",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    Check Out
                  </div>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 800,
                      color: hasCheckedOut
                        ? isEarly
                          ? "#dc2626"
                          : "#d97706"
                        : "#9ca3af",
                      marginTop: 6,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {hasCheckedOut ? formatTimeShort(today.check_out) : "—"}
                  </div>
                  {hasCheckedOut && (
                    <div
                      style={{
                        fontSize: 11,
                        marginTop: 4,
                        color: isEarly ? "#dc2626" : "#d97706",
                        fontWeight: 700,
                      }}
                    >
                      {isEarly
                        ? `⚠ Early ${formatMinutes(today.early_minutes)}`
                        : "✓ Full Day"}
                    </div>
                  )}
                </div>
              </div>

              {hasCheckedOut && isEarly && today?.early_logout_reason && (
                <div
                  style={{
                    padding: 12,
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    borderRadius: 8,
                    marginBottom: 16,
                    fontSize: 12.5,
                    color: "#991b1b",
                  }}
                >
                  <strong>Early logout reason:</strong>{" "}
                  {today.early_logout_reason}
                </div>
              )}

              {hasCheckedIn && hasCheckedOut && (
                <div
                  style={{
                    padding: 14,
                    borderRadius: 10,
                    background: "#eef2ff",
                    marginBottom: 16,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    justifyContent: "center",
                    border: "1px solid #c7d2fe",
                  }}
                >
                  <TrendingUp size={18} color="#4f46e5" />
                  <span
                    style={{ fontSize: 14, fontWeight: 700, color: "#4338ca" }}
                  >
                    Total worked: {formatHours(today.working_hours)}
                  </span>
                </div>
              )}

              {renderActionButton()}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="col-12 col-lg-6">
            <div className="erp-card" style={{ fontFamily: FONT }}>
              <div className="d-flex align-items-center gap-2 mb-3">
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: "#ecfdf5",
                    color: "#059669",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <CheckCircle2 size={18} />
                </div>
                <div>
                  <h5 style={{ fontWeight: 700, margin: 0, fontSize: 15 }}>
                    Quick Stats
                  </h5>
                  <div
                    style={{ fontSize: 11.5, color: "#94a3b8", marginTop: 1 }}
                  >
                    Today's overview
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 13.5,
                  marginBottom: 12,
                  alignItems: "center",
                  padding: "10px 0",
                }}
              >
                <span style={{ color: "#6b7280", fontWeight: 600 }}>
                  Status
                </span>
                <strong
                  style={{
                    color: hasOpenSession
                      ? "#dc2626"
                      : hasCheckedOut
                      ? isEarly
                        ? "#dc2626"
                        : "#059669"
                      : hasCheckedIn
                      ? isLate
                        ? "#dc2626"
                        : "#059669"
                      : "#6b7280",
                    fontSize: 13,
                  }}
                >
                  {hasOpenSession && openSession?.is_overnight
                    ? "Forgot Logout (Pending)"
                    : hasCheckedOut
                    ? isEarly
                      ? "Early Logout"
                      : "Day Completed"
                    : hasCheckedIn
                    ? isLate
                      ? "Working (Late)"
                      : "Working"
                    : "Not Checked In"}
                </strong>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 13.5,
                  alignItems: "center",
                  paddingTop: 12,
                  paddingBottom: 10,
                  borderTop: "1px solid #f1f5f9",
                }}
              >
                <span style={{ color: "#6b7280", fontWeight: 600 }}>
                  Shift
                </span>
                <strong style={{ fontSize: 13, color: "#4f46e5" }}>
                  {shiftName}
                </strong>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 13.5,
                  alignItems: "center",
                  paddingTop: 12,
                  borderTop: "1px solid #f1f5f9",
                }}
              >
                <span style={{ color: "#6b7280", fontWeight: 600 }}>
                  Shift Hours
                </span>
                <strong style={{ fontSize: 13 }}>
                  {shiftStartText} — {shiftEndText}
                </strong>
              </div>

              {myUsage && myUsage.usage > 0 && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 13.5,
                    alignItems: "center",
                    paddingTop: 12,
                    borderTop: "1px solid #f1f5f9",
                  }}
                >
                  <span style={{ color: "#6b7280", fontWeight: 600 }}>
                    Forgot Logout (Month)
                  </span>
                  <strong
                    style={{
                      fontSize: 13,
                      color:
                        myUsage.usage > myUsage.max_allowed
                          ? "#dc2626"
                          : "#d97706",
                    }}
                  >
                    {myUsage.usage} / {myUsage.max_allowed}
                    {myUsage.total_fine > 0 &&
                      ` (₹${myUsage.total_fine} fine)`}
                  </strong>
                </div>
              )}

              {today && (hasCheckedIn || hasCheckedOut) && (
                <div
                  style={{
                    marginTop: 16,
                    paddingTop: 16,
                    borderTop: "1px solid #f1f5f9",
                  }}
                >
                  <div
                    style={{
                      fontSize: 10.5,
                      color: "#94a3b8",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                      marginBottom: 10,
                    }}
                  >
                    Today's Summary
                  </div>
                  <div className="row g-2" style={{ fontSize: 12.5 }}>
                    <div className="col-6">
                      <div
                        style={{
                          padding: 10,
                          background: "#f8fafc",
                          borderRadius: 8,
                          border: "1px solid #e2e8f0",
                        }}
                      >
                        <div
                          style={{
                            color: "#94a3b8",
                            fontSize: 10.5,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: 0.4,
                          }}
                        >
                          Worked
                        </div>
                        <div
                          style={{
                            fontWeight: 800,
                            color: "#4f46e5",
                            marginTop: 2,
                            fontSize: 14,
                          }}
                        >
                          {formatHours(today.working_hours)}
                        </div>
                      </div>
                    </div>
                    <div className="col-6">
                      <div
                        style={{
                          padding: 10,
                          background: isLate ? "#fef2f2" : "#f8fafc",
                          borderRadius: 8,
                          border: `1px solid ${
                            isLate ? "#fecaca" : "#e2e8f0"
                          }`,
                        }}
                      >
                        <div
                          style={{
                            color: isLate ? "#dc2626" : "#94a3b8",
                            fontSize: 10.5,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: 0.4,
                          }}
                        >
                          {isLate ? "Late By" : "Punctuality"}
                        </div>
                        <div
                          style={{
                            fontWeight: 800,
                            color: isLate ? "#dc2626" : "#059669",
                            marginTop: 2,
                            fontSize: 14,
                          }}
                        >
                          {isLate
                            ? formatMinutes(today.late_minutes)
                            : "On Time"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Early Logout Modal */}
        <Modal
          open={earlyModal}
          onClose={() => {
            setEarlyModal(false);
            setEarlyReason("");
            setEarlyMinutes(0);
          }}
          title="Early Logout Request"
          footer={
            <>
              <button
                className="erp-btn erp-btn-outline"
                onClick={() => {
                  setEarlyModal(false);
                  setEarlyReason("");
                  setEarlyMinutes(0);
                }}
                style={{ fontFamily: FONT }}
              >
                Cancel
              </button>
              <button
                className="erp-btn erp-btn-danger"
                onClick={() => submitCheckOut(earlyReason)}
                disabled={!earlyReason.trim() || earlyReason.length < 10 || busy}
                style={{ fontFamily: FONT }}
              >
                <LogOut size={14} />
                {busy ? "Submitting..." : "Confirm Check Out"}
              </button>
            </>
          }
        >
          <div
            style={{
              padding: 14,
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: 10,
              marginBottom: 18,
              display: "flex",
              gap: 10,
              alignItems: "flex-start",
              fontSize: 13,
              color: "#991b1b",
              fontFamily: FONT,
              lineHeight: 1.55,
            }}
          >
            <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <strong>You're logging out before your shift ends.</strong>
              <br />
              Shift ends at <strong>{shiftEndText}</strong>
              {earlyMinutes > 0 && (
                <>
                  {" "}
                  — you're logging out{" "}
                  <strong>{formatMinutes(earlyMinutes)} early</strong>
                </>
              )}
              .
            </div>
          </div>

          <div
            style={{
              padding: 10,
              background: "#fef3c7",
              border: "1px solid #fde68a",
              borderRadius: 8,
              marginBottom: 16,
              fontSize: 12,
              color: "#92400e",
              fontFamily: FONT,
              lineHeight: 1.5,
            }}
          >
            <strong>Note:</strong> A valid reason is required (min 10
            characters). Your manager will be notified.
          </div>

          <div className="mb-3">
            <label className="erp-label">Reason for Early Logout *</label>
            <textarea
              className="erp-input"
              rows={4}
              placeholder="Please explain why you are logging out early (min 10 characters)..."
              value={earlyReason}
              onChange={(e) => setEarlyReason(e.target.value)}
              style={{ resize: "vertical", fontFamily: FONT }}
              autoFocus
            />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 4,
                fontSize: 11,
                color: earlyReason.length >= 10 ? "#059669" : "#9ca3af",
                fontFamily: FONT,
              }}
            >
              <span>
                {earlyReason.length >= 10
                  ? "✓ Reason looks good"
                  : "Minimum 10 characters required"}
              </span>
              <span style={{ fontWeight: 600 }}>{earlyReason.length}/10</span>
            </div>
          </div>
        </Modal>

        {/* Forgot Logout Modal (still available if blocked) */}
        <Modal
          open={forgotModal}
          onClose={() => {
            setForgotModal(false);
            setForgotReason("");
          }}
          title="Forgot to Logout"
          footer={
            <>
              <button
                className="erp-btn erp-btn-outline"
                onClick={() => {
                  setForgotModal(false);
                  setForgotReason("");
                }}
                style={{ fontFamily: FONT }}
              >
                Cancel
              </button>
              <button
                className="erp-btn erp-btn-primary"
                onClick={submitForgotLogout}
                disabled={forgotSending || forgotReason.length < 10}
                style={{ fontFamily: FONT }}
              >
                <Send size={14} />
                {forgotSending ? "Sending..." : "Send Request"}
              </button>
            </>
          }
        >
          {blockedInfo && (
            <>
              <div
                style={{
                  padding: 14,
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: 8,
                  marginBottom: 16,
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
                  fontSize: 13,
                  color: "#991b1b",
                  fontFamily: FONT,
                  lineHeight: 1.5,
                }}
              >
                <AlertTriangle
                  size={18}
                  style={{ flexShrink: 0, marginTop: 2 }}
                />
                <div>
                  <strong>Login Blocked!</strong>
                  <br />
                  You forgot to logout on{" "}
                  <strong>{formatDateShort(blockedInfo.date)}</strong>.
                  <br />
                  Send a request to your manager to unlock.
                </div>
              </div>

              <div className="mb-3">
                <label className="erp-label">
                  Reason for not logging out *
                </label>
                <textarea
                  className="erp-input"
                  rows={4}
                  placeholder="Explain why you forgot to logout (min 10 characters)..."
                  value={forgotReason}
                  onChange={(e) => setForgotReason(e.target.value)}
                  style={{ resize: "vertical", fontFamily: FONT }}
                  autoFocus
                />
                <small style={{ color: "#9ca3af", fontSize: 11 }}>
                  {forgotReason.length}/10 characters minimum
                </small>
              </div>
            </>
          )}
        </Modal>

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

export default EmployeeDashboard;