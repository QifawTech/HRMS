import { useState, useEffect } from "react";
import {
  Lock,
  Save,
  Eye,
  EyeOff,
  AlertCircle,
  Building2,
  Clock,
  Calendar,
} from "lucide-react";
import Layout from "../../components/layout/Layout";
import Toast from "../../components/common/Toast";
import * as api from "../../api/settingsApi";
import * as empApi from "../../api/employeeApi";

const FONT = "'Inter', 'Segoe UI', -apple-system, sans-serif";

// ? 24-hour ? 12-hour (AM/PM)
const formatTime12 = (t) => {
  if (!t) return "—";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ampm}`;
};

const Row = ({ Icon, label, value }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "12px 14px",
      background: "#f9fafb",
      borderRadius: 10,
      marginBottom: 8,
      fontFamily: FONT,
    }}
  >
    <Icon size={16} color="#4f46e5" />
    <div style={{ flex: 1 }}>
      <div
        style={{
          fontSize: 11.5,
          color: "#6b7280",
          fontWeight: 600,
          fontFamily: FONT,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 13.5,
          fontWeight: 600,
          color: "#111827",
          fontFamily: FONT,
        }}
      >
        {value}
      </div>
    </div>
  </div>
);

const EmployeeSettings = () => {
  const [toast, setToast] = useState(null);
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [saving, setSaving] = useState(false);
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);

  const [company, setCompany] = useState(null);
  const [myProfile, setMyProfile] = useState(null);

  useEffect(() => {
    api
      .getCompanySettings()
      .then((res) => setCompany(res.data))
      .catch(() => {});

    // ? Fetch employee's own profile for shift info
    empApi
      .getMyProfile()
      .then((res) => setMyProfile(res.data))
      .catch(() => {});
  }, []);

  const handlePasswordSave = async () => {
    if (!currentPwd || !newPwd || !confirmPwd) {
      setToast({ message: "Fill all fields", type: "error" });
      return;
    }
    if (newPwd !== confirmPwd) {
      setToast({ message: "Passwords don't match", type: "error" });
      return;
    }
    if (newPwd.length < 6) {
      setToast({ message: "Min 6 characters", type: "error" });
      return;
    }
    setSaving(true);
    try {
      await api.updatePassword(currentPwd, newPwd);
      setCurrentPwd("");
      setNewPwd("");
      setConfirmPwd("");
      setToast({
        message: "Password updated! Please login again.",
        type: "success",
      });
      setTimeout(() => {
        localStorage.clear();
        window.location.href = "/login";
      }, 2000);
    } catch (err) {
      setToast({
        message: err.response?.data?.error || "Failed",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  // ? Compute shift display values
  const hasShift =
    myProfile?.shift_name &&
    myProfile?.shift_start &&
    myProfile?.shift_end;

  const shiftName = hasShift
    ? myProfile.shift_name
    : "Default Shift";

  const shiftStartText = hasShift
    ? formatTime12(myProfile.shift_start)
    : company
    ? formatTime12(company.work_start_time)
    : "—";

  const shiftEndText = hasShift
    ? formatTime12(myProfile.shift_end)
    : company
    ? formatTime12(company.work_end_time)
    : "—";

  return (
    <Layout>
      <div className="mb-4" style={{ fontFamily: FONT }}>
        <h1 className="erp-page-title">Settings</h1>
        <p className="erp-page-subtitle mb-0">Manage your account</p>
      </div>

      <div className="row g-3" style={{ fontFamily: FONT }}>
        {/* Company Info (Read-only) */}
        {company && (
          <div className="col-12 col-lg-6">
            <div className="erp-card" style={{ padding: 22 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 16,
                  paddingBottom: 12,
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background: "#eef2ff",
                    color: "#4f46e5",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Building2 size={18} />
                </div>
                <div>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 14,
                      fontFamily: FONT,
                    }}
                  >
                    Company Info
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "#6b7280",
                      fontFamily: FONT,
                    }}
                  >
                    Read-only · Set by manager
                  </div>
                </div>
              </div>

              <Row
                Icon={Building2}
                label="Company"
                value={company.company_name}
              />

              {/* ? Shift info — with name + 12-hour timing */}
              <Row
                Icon={Clock}
                label="Your Shift"
                value={shiftName}
              />

              <Row
                Icon={Clock}
                label="Shift Hours"
                value={`${shiftStartText} – ${shiftEndText}`}
              />

              <Row
                Icon={Calendar}
                label="Working Days"
                value={company.working_days.join(", ")}
              />
            </div>
          </div>
        )}

        {/* Password Change */}
        <div className="col-12 col-lg-6">
          <div className="erp-card" style={{ padding: 22 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 16,
                paddingBottom: 12,
                borderBottom: "1px solid var(--border)",
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: "#fef3c7",
                  color: "#d97706",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Lock size={18} />
              </div>
              <div>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 14,
                    fontFamily: FONT,
                  }}
                >
                  Change Password
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "#6b7280",
                    fontFamily: FONT,
                  }}
                >
                  Update your login password
                </div>
              </div>
            </div>

            <div className="mb-3">
              <label className="erp-label">Current Password</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showCurrentPwd ? "text" : "password"}
                  className="erp-input"
                  value={currentPwd}
                  onChange={(e) => setCurrentPwd(e.target.value)}
                  placeholder="Enter current password"
                  style={{ fontFamily: FONT }}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPwd(!showCurrentPwd)}
                  style={{
                    position: "absolute",
                    right: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: "#9ca3af",
                  }}
                >
                  {showCurrentPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="mb-3">
              <label className="erp-label">New Password</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showNewPwd ? "text" : "password"}
                  className="erp-input"
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                  placeholder="Min 6 characters"
                  style={{ fontFamily: FONT }}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPwd(!showNewPwd)}
                  style={{
                    position: "absolute",
                    right: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: "#9ca3af",
                  }}
                >
                  {showNewPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="mb-3">
              <label className="erp-label">Confirm New Password</label>
              <input
                type="password"
                className="erp-input"
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                placeholder="Re-enter password"
                style={{ fontFamily: FONT }}
              />
            </div>

            <button
              className="erp-btn erp-btn-primary w-100"
              onClick={handlePasswordSave}
              disabled={saving}
              style={{ justifyContent: "center", fontFamily: FONT }}
            >
              <Lock size={14} />
              {saving ? "Updating..." : "Change Password"}
            </button>

            <div
              style={{
                marginTop: 14,
                padding: 12,
                background: "#fef3c7",
                border: "1px solid #fde68a",
                borderRadius: 8,
                fontSize: 12.5,
                color: "#92400e",
                display: "flex",
                gap: 8,
                alignItems: "flex-start",
                fontFamily: FONT,
              }}
            >
              <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                You'll be <strong>logged out</strong> after password change.
              </div>
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

export default EmployeeSettings;