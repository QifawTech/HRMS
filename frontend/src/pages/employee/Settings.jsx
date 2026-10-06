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
    }}
  >
    <Icon size={16} color="#4f46e5" />
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 11.5, color: "#6b7280", fontWeight: 600 }}>
        {label}
      </div>
      <div style={{ fontSize: 13.5, fontWeight: 600, color: "#111827" }}>
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

  useEffect(() => {
    api
      .getCompanySettings()
      .then((res) => setCompany(res.data))
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

  return (
    <Layout>
      <div className="mb-4">
        <h1 className="erp-page-title">Settings</h1>
        <p className="erp-page-subtitle mb-0">Manage your account</p>
      </div>

      <div className="row g-3">
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
                  <div style={{ fontWeight: 700, fontSize: 14 }}>
                    Company Info
                  </div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>
                    Read-only · Set by manager
                  </div>
                </div>
              </div>

              <Row
                Icon={Building2}
                label="Company"
                value={company.company_name}
              />
              <Row
                Icon={Clock}
                label="Work Hours"
                value={`${company.work_start_time} – ${company.work_end_time}`}
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
                <div style={{ fontWeight: 700, fontSize: 14 }}>
                  Change Password
                </div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>
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
              />
            </div>

            <button
              className="erp-btn erp-btn-primary w-100"
              onClick={handlePasswordSave}
              disabled={saving}
              style={{ justifyContent: "center" }}
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