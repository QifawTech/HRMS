import { useState, useEffect, useRef } from "react";
import {
  Building2,
  Mail,
  Lock,
  Save,
  User,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Upload,
  Wallet,
  Plus,
  Trash2,
  Receipt,
  Clock,
  Pencil,
  ShieldAlert,
} from "lucide-react";
import Layout from "../../components/layout/Layout";
import Toast from "../../components/common/Toast";
import * as api from "../../api/settingsApi";
import * as shiftApi from "../../api/shiftApi";

const FONT = "'Calibri', 'Segoe UI', -apple-system, sans-serif";

const WORKING_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Format "06:00" → "06:00 AM", "14:00" → "02:00 PM"
const formatTime12 = (t) => {
  if (!t) return "—";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ampm}`;
};

const SectionCard = ({ icon: Icon, title, subtitle, children }) => (
  <div className="erp-card" style={{ padding: 22, marginBottom: 20 }}>
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        marginBottom: 18,
        paddingBottom: 14,
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: 12,
          background: "#eef2ff",
          color: "#4f46e5",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon size={20} />
      </div>
      <div>
        <div style={{ fontWeight: 700, fontSize: 15 }}>{title}</div>
        {subtitle && (
          <div style={{ fontSize: 12.5, color: "#6b7280", marginTop: 2 }}>
            {subtitle}
          </div>
        )}
      </div>
    </div>
    {children}
  </div>
);

const MiniBox = ({ label, value, highlight }) => (
  <div
    style={{
      padding: "8px 10px",
      background: "white",
      borderRadius: 8,
      border: "1px solid #e2e8f0",
      textAlign: "center",
    }}
  >
    <div
      style={{
        fontSize: 9.5,
        fontWeight: 700,
        color: "#94a3b8",
        textTransform: "uppercase",
        letterSpacing: 0.4,
        marginBottom: 3,
      }}
    >
      {label}
    </div>
    <div
      style={{
        fontSize: 13,
        fontWeight: 800,
        color: highlight ? "#4f46e5" : "#0f172a",
        letterSpacing: "-0.2px",
      }}
    >
      {value}
    </div>
  </div>
);

const ManagerSettings = () => {
  const [toast, setToast] = useState(null);

  // Company settings
  const [company, setCompany] = useState({
    company_name: "",
    company_address: "",
    company_tagline: "",
    company_footer: "",
    company_logo_url: "",
    signatory_name: "",
    signatory_title: "Authorized Signatory",
    work_start_time: "09:30",
    work_end_time: "17:30",
    grace_period_minutes: 15,
    working_days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    basic_percent: 50,
    hra_percent_of_basic: 40,
    pf_percent: 12,
    esi_percent: 0.75,
    tds_percent: 0,
    // NEW: Forgot logout settings
    forgot_logout_enabled: true,
    forgot_logout_max_per_month: 3,
    forgot_logout_fine_amount: 200,
  });
  const [companyLoading, setCompanyLoading] = useState(true);
  const [companySaving, setCompanySaving] = useState(false);

  // PT Slabs state
  const [ptSlabs, setPtSlabs] = useState([]);
  const [ptSlabsLoading, setPtSlabsLoading] = useState(true);
  const [ptSlabsSaving, setPtSlabsSaving] = useState(false);

  // Shift state
  const [shifts, setShifts] = useState([]);
  const [shiftsLoading, setShiftsLoading] = useState(true);
  const [shiftModalOpen, setShiftModalOpen] = useState(false);
  const [editShift, setEditShift] = useState(null);
  const [shiftForm, setShiftForm] = useState({
    name: "",
    start_time: "09:30",
    end_time: "17:30",
    grace_period_minutes: 15,
  });
  const [shiftSaving, setShiftSaving] = useState(false);

  // Email / Password
  const [email, setEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);
  const [showEmailPwd, setShowEmailPwd] = useState(false);

  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdSaving, setPwdSaving] = useState(false);
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoRef = useRef(null);

  // Load
  useEffect(() => {
    Promise.all([
      api.getCompanySettings(),
      api.getMyAccount(),
      api.getProfessionalTaxSlabs(),
      shiftApi.listShifts(),
    ])
      .then(([cRes, aRes, ptRes, shRes]) => {
        setCompany((prev) => ({ ...prev, ...cRes.data }));
        setEmail(aRes.data.email || "");
        setNewEmail(aRes.data.email || "");
        setPtSlabs(ptRes.data || []);
        setShifts(Array.isArray(shRes.data) ? shRes.data : []);
      })
      .catch((e) => console.error(e))
      .finally(() => {
        setCompanyLoading(false);
        setPtSlabsLoading(false);
        setShiftsLoading(false);
      });
  }, []);

  // Logo upload
  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setToast({ message: "Please select an image", type: "error" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setToast({ message: "Logo too large (max 2MB)", type: "error" });
      return;
    }
    setUploadingLogo(true);
    try {
      const res = await api.uploadCompanyLogo(file);
      setCompany((c) => ({ ...c, company_logo_url: res.data.logo_url }));
      setToast({ message: "Logo uploaded!", type: "success" });
    } catch (err) {
      setToast({
        message: err.response?.data?.error || "Upload failed",
        type: "error",
      });
    } finally {
      setUploadingLogo(false);
      if (logoRef.current) logoRef.current.value = "";
    }
  };

  const getLogoUrl = (url) => {
    if (!url) return null;
    if (url.startsWith("http")) return url;
    return `${url}`;
  };

  const handleCompanySave = async () => {
    setCompanySaving(true);
    try {
      await api.updateCompanySettings(company);
      setToast({ message: "Settings saved!", type: "success" });
    } catch (err) {
      setToast({
        message: err.response?.data?.error || "Failed to save",
        type: "error",
      });
    } finally {
      setCompanySaving(false);
    }
  };

  // PT Slabs handlers
  const handlePtSlabChange = (index, field, value) => {
    setPtSlabs((prev) => {
      const copy = [...prev];
      if (field === "max_salary") {
        copy[index] = {
          ...copy[index],
          max_salary: value === "" ? null : parseFloat(value),
        };
      } else if (field === "min_salary" || field === "tax_amount") {
        copy[index] = { ...copy[index], [field]: parseFloat(value) || 0 };
      } else {
        copy[index] = { ...copy[index], [field]: value };
      }
      return copy;
    });
  };

  const handleAddPtSlab = () => {
    setPtSlabs((prev) => [
      ...prev,
      { min_salary: 0, max_salary: null, tax_amount: 0 },
    ]);
  };

  const handleRemovePtSlab = (index) => {
    setPtSlabs((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePtSlabsSave = async () => {
    for (let i = 0; i < ptSlabs.length; i++) {
      const s = ptSlabs[i];
      if (s.min_salary === null || s.min_salary === undefined) {
        setToast({
          message: `Row ${i + 1}: Min salary required`,
          type: "error",
        });
        return;
      }
    }

    setPtSlabsSaving(true);
    try {
      await api.updateProfessionalTaxSlabs(ptSlabs);
      const res = await api.getProfessionalTaxSlabs();
      setPtSlabs(res.data || []);
      setToast({ message: "PT Slabs saved!", type: "success" });
    } catch (err) {
      setToast({
        message: err.response?.data?.error || "Failed to save slabs",
        type: "error",
      });
    } finally {
      setPtSlabsSaving(false);
    }
  };

  // Shift handlers
  const openAddShift = () => {
    setEditShift(null);
    setShiftForm({
      name: "",
      start_time: "09:30",
      end_time: "17:30",
      grace_period_minutes: 15,
    });
    setShiftModalOpen(true);
  };

  const openEditShift = (s) => {
    setEditShift(s);
    setShiftForm({
      name: s.name,
      start_time: s.start_time,
      end_time: s.end_time,
      grace_period_minutes: s.grace_period_minutes || 15,
    });
    setShiftModalOpen(true);
  };

  const handleShiftSave = async () => {
    if (!shiftForm.name.trim()) {
      setToast({ message: "Shift name required", type: "error" });
      return;
    }
    setShiftSaving(true);
    try {
      if (editShift) {
        await shiftApi.updateShift(editShift._id, shiftForm);
        setToast({ message: "Shift updated!", type: "success" });
      } else {
        await shiftApi.createShift(shiftForm);
        setToast({ message: "Shift created!", type: "success" });
      }
      const res = await shiftApi.listShifts();
      setShifts(Array.isArray(res.data) ? res.data : []);
      setShiftModalOpen(false);
    } catch (err) {
      setToast({
        message: err.response?.data?.error || "Failed to save shift",
        type: "error",
      });
    } finally {
      setShiftSaving(false);
    }
  };

  const handleShiftDelete = async (s) => {
    if (!window.confirm(`Deactivate "${s.name}"?`)) return;
    try {
      await shiftApi.deleteShift(s._id);
      setToast({ message: "Shift deactivated", type: "success" });
      const res = await shiftApi.listShifts();
      setShifts(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setToast({
        message: err.response?.data?.error || "Failed to delete",
        type: "error",
      });
    }
  };

  const handleEmailSave = async () => {
    if (!emailPassword) {
      setToast({ message: "Enter current password", type: "error" });
      return;
    }
    if (newEmail === email) {
      setToast({ message: "No change detected", type: "error" });
      return;
    }
    setEmailSaving(true);
    try {
      const res = await api.updateEmail(newEmail, emailPassword);
      setEmail(res.data.new_email);
      setEmailPassword("");
      setToast({
        message: "Email updated! Please login again.",
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
      setEmailSaving(false);
    }
  };

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
    setPwdSaving(true);
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
      setPwdSaving(false);
    }
  };

  const toggleDay = (day) => {
    setCompany((c) => ({
      ...c,
      working_days: c.working_days.includes(day)
        ? c.working_days.filter((d) => d !== day)
        : [...c.working_days, day],
    }));
  };

  if (companyLoading) {
    return (
      <Layout>
        <div className="erp-card text-center py-5" style={{ color: "#6b7280" }}>
          <div className="spinner-border spinner-border-sm me-2" />
          Loading settings...
        </div>
      </Layout>
    );
  }

  const previewTotal = 15000;
  const previewBasic = (previewTotal * (company.basic_percent || 0)) / 100;
  const previewHra = (previewBasic * (company.hra_percent_of_basic || 0)) / 100;
  const previewSpecial = previewTotal - previewBasic - previewHra;

  return (
    <Layout>
      <div style={{ fontFamily: FONT, maxWidth: 1100, margin: "0 auto" }}>
        <div className="mb-4">
          <h1 className="erp-page-title">Settings</h1>
          <p className="erp-page-subtitle mb-0">
            Manage your account and company preferences
          </p>
        </div>

        {/* Company Settings */}
        <SectionCard
          icon={Building2}
          title="Company Settings"
          subtitle="Company details used on payslips"
        >
          <div className="row g-3">
            <div className="col-12">
              <label className="erp-label">Company Name</label>
              <input
                className="erp-input"
                value={company.company_name}
                onChange={(e) =>
                  setCompany({ ...company, company_name: e.target.value })
                }
              />
            </div>

            <div className="col-12">
              <label className="erp-label">Company Logo</label>
              <div className="d-flex align-items-center gap-3">
                {company.company_logo_url ? (
                  <div
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: 10,
                      border: "1px solid var(--border)",
                      background: `#fff url(${getLogoUrl(
                        company.company_logo_url
                      )}) center/contain no-repeat`,
                      flexShrink: 0,
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: 10,
                      border: "2px dashed #d1d5db",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#9ca3af",
                      fontSize: 11,
                      flexShrink: 0,
                      background: "#f9fafb",
                    }}
                  >
                    No Logo
                  </div>
                )}
                <div>
                  <input
                    ref={logoRef}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={handleLogoUpload}
                  />
                  <button
                    type="button"
                    className="erp-btn erp-btn-outline"
                    onClick={() => logoRef.current?.click()}
                    disabled={uploadingLogo}
                    style={{ fontFamily: FONT }}
                  >
                    <Upload size={14} />
                    {uploadingLogo ? "Uploading..." : "Upload Logo"}
                  </button>
                  <div
                    style={{ fontSize: 11, color: "#9ca3af", marginTop: 6 }}
                  >
                    PNG, JPG, SVG · Max 2MB
                  </div>
                </div>
              </div>
            </div>

            <div className="col-12">
              <label className="erp-label">Company Address</label>
              <textarea
                className="erp-input"
                rows={2}
                placeholder="Full address (used on payslip header)"
                value={company.company_address || ""}
                onChange={(e) =>
                  setCompany({ ...company, company_address: e.target.value })
                }
                style={{ resize: "vertical" }}
              />
            </div>

            <div className="col-12 col-md-6">
              <label className="erp-label">Tagline</label>
              <input
                className="erp-input"
                placeholder="e.g., Grow Together"
                value={company.company_tagline || ""}
                onChange={(e) =>
                  setCompany({ ...company, company_tagline: e.target.value })
                }
              />
            </div>

            <div className="col-12 col-md-6">
              <label className="erp-label">Footer Text</label>
              <input
                className="erp-input"
                placeholder="e.g., Innovative Technology | Better Business"
                value={company.company_footer || ""}
                onChange={(e) =>
                  setCompany({ ...company, company_footer: e.target.value })
                }
              />
            </div>

            <div className="col-12 col-md-6">
              <label className="erp-label">Signatory Name</label>
              <input
                className="erp-input"
                placeholder="e.g., Priya S"
                value={company.signatory_name || ""}
                onChange={(e) =>
                  setCompany({ ...company, signatory_name: e.target.value })
                }
              />
            </div>

            <div className="col-12 col-md-6">
              <label className="erp-label">Signatory Title</label>
              <input
                className="erp-input"
                placeholder="e.g., Authorized Signatory"
                value={company.signatory_title || ""}
                onChange={(e) =>
                  setCompany({ ...company, signatory_title: e.target.value })
                }
              />
            </div>

            <div className="col-12 col-md-6">
              <label className="erp-label">Work Start Time</label>
              <input
                type="time"
                className="erp-input"
                value={company.work_start_time}
                onChange={(e) =>
                  setCompany({ ...company, work_start_time: e.target.value })
                }
              />
              <small style={{ color: "#9ca3af", fontSize: 11 }}>
                Default for employees without a shift
              </small>
            </div>

            <div className="col-12 col-md-6">
              <label className="erp-label">Work End Time</label>
              <input
                type="time"
                className="erp-input"
                value={company.work_end_time}
                onChange={(e) =>
                  setCompany({ ...company, work_end_time: e.target.value })
                }
              />
              <small style={{ color: "#9ca3af", fontSize: 11 }}>
                Default for employees without a shift
              </small>
            </div>

            <div className="col-12 col-md-6">
              <label className="erp-label">Grace Period (Minutes)</label>
              <input
                type="number"
                className="erp-input"
                min={0}
                max={60}
                value={company.grace_period_minutes}
                onChange={(e) =>
                  setCompany({
                    ...company,
                    grace_period_minutes: parseInt(e.target.value) || 0,
                  })
                }
              />
              <small style={{ color: "#9ca3af", fontSize: 11 }}>
                Extra minutes allowed before marking as late
              </small>
            </div>

            <div className="col-12">
              <label className="erp-label">Working Days</label>
              <div className="d-flex gap-2 flex-wrap">
                {WORKING_DAYS.map((d) => {
                  const active = company.working_days.includes(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => toggleDay(d)}
                      className="erp-btn"
                      style={{
                        background: active ? "var(--primary)" : "white",
                        color: active ? "white" : "#6b7280",
                        border: `1px solid ${
                          active ? "var(--primary)" : "#e5e7eb"
                        }`,
                        padding: "8px 16px",
                        fontSize: 12.5,
                        minWidth: 60,
                        justifyContent: "center",
                      }}
                    >
                      {active && <CheckCircle2 size={12} />}
                      {d}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="col-12 d-flex justify-content-end">
              <button
                className="erp-btn erp-btn-primary"
                onClick={handleCompanySave}
                disabled={companySaving}
              >
                <Save size={14} />
                {companySaving ? "Saving..." : "Save Company Settings"}
              </button>
            </div>
          </div>
        </SectionCard>

        {/* Shift Management */}
        <SectionCard
          icon={Clock}
          title="Shift Management"
          subtitle="Define work shifts and assign to employees"
        >
          <div
            style={{
              padding: 14,
              background: "#ecfeff",
              borderRadius: 10,
              marginBottom: 16,
              border: "1px solid #a5f3fc",
            }}
          >
            <div style={{ fontSize: 12.5, color: "#155e75", lineHeight: 1.55 }}>
              <strong>How it works:</strong> Create shifts with start/end times.
              Assign a shift to each employee. Attendance late/early
              calculations use the employee's assigned shift.
            </div>
          </div>

          {shiftsLoading ? (
            <div
              className="text-center py-4"
              style={{ color: "#6b7280", fontSize: 13 }}
            >
              <div className="spinner-border spinner-border-sm me-2" />
              Loading shifts...
            </div>
          ) : (
            <>
              <div className="table-responsive">
                <table
                  className="table align-middle"
                  style={{ fontSize: 13, marginBottom: 0 }}
                >
                  <thead>
                    <tr
                      style={{
                        background: "#f8fafc",
                        fontSize: 11,
                        color: "#64748b",
                        textTransform: "uppercase",
                        letterSpacing: 0.4,
                      }}
                    >
                      <th style={{ width: 40 }}>#</th>
                      <th>Shift Name</th>
                      <th>Start Time</th>
                      <th>End Time</th>
                      <th>Grace (min)</th>
                      <th style={{ width: 100 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shifts.map((s, idx) => (
                      <tr key={s._id}>
                        <td style={{ color: "#94a3b8", fontWeight: 600 }}>
                          {idx + 1}
                        </td>
                        <td style={{ fontWeight: 600 }}>{s.name}</td>
                        <td style={{ fontWeight: 600, color: "#0f172a" }}>
                          {formatTime12(s.start_time)}
                        </td>
                        <td style={{ fontWeight: 600, color: "#0f172a" }}>
                          {formatTime12(s.end_time)}
                        </td>
                        <td>{s.grace_period_minutes}</td>
                        <td>
                          <div className="d-flex gap-1">
                            <button
                              type="button"
                              onClick={() => openEditShift(s)}
                              title="Edit"
                              style={{
                                background: "#eef2ff",
                                border: "none",
                                color: "#4f46e5",
                                borderRadius: 6,
                                padding: "5px 8px",
                                cursor: "pointer",
                              }}
                            >
                              <Pencil size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleShiftDelete(s)}
                              title="Deactivate"
                              style={{
                                background: "#fee2e2",
                                border: "none",
                                color: "#dc2626",
                                borderRadius: 6,
                                padding: "5px 8px",
                                cursor: "pointer",
                              }}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {shifts.length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="text-center"
                          style={{ color: "#9ca3af", padding: 20 }}
                        >
                          No shifts yet. Click "Add Shift".
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="d-flex justify-content-end mt-3">
                <button
                  type="button"
                  className="erp-btn erp-btn-primary"
                  onClick={openAddShift}
                >
                  <Plus size={14} /> Add Shift
                </button>
              </div>
            </>
          )}
        </SectionCard>

        {/* Payroll Structure */}
        <SectionCard
          icon={Wallet}
          title="Payroll Structure"
          subtitle="Salary breakup applied to all employees"
        >
          <div
            style={{
              padding: 14,
              background: "#eef2ff",
              borderRadius: 10,
              marginBottom: 16,
              border: "1px solid #c7d2fe",
            }}
          >
            <div style={{ fontSize: 12.5, color: "#3730a3", lineHeight: 1.55 }}>
              <strong>How it works:</strong> When you add an employee, enter
              only their <strong>Total Monthly Salary</strong>. The system
              auto-calculates Basic, HRA, Special Allowance, and Professional
              Tax using these settings.
            </div>
          </div>

          <div className="row g-3">
            <div className="col-6 col-md-3">
              <label className="erp-label">Basic % of Total</label>
              <input
                type="number"
                className="erp-input"
                step="0.5"
                min="0"
                max="100"
                value={company.basic_percent}
                onChange={(e) =>
                  setCompany({
                    ...company,
                    basic_percent: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div className="col-6 col-md-3">
              <label className="erp-label">HRA % of Basic</label>
              <input
                type="number"
                className="erp-input"
                step="0.5"
                min="0"
                max="100"
                value={company.hra_percent_of_basic}
                onChange={(e) =>
                  setCompany({
                    ...company,
                    hra_percent_of_basic: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div className="col-6 col-md-3">
              <label className="erp-label">PF % of Basic</label>
              <input
                type="number"
                className="erp-input"
                step="0.1"
                min="0"
                max="50"
                value={company.pf_percent}
                onChange={(e) =>
                  setCompany({
                    ...company,
                    pf_percent: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div className="col-6 col-md-3">
              <label className="erp-label">ESI % of Gross</label>
              <input
                type="number"
                className="erp-input"
                step="0.01"
                min="0"
                max="10"
                value={company.esi_percent}
                onChange={(e) =>
                  setCompany({
                    ...company,
                    esi_percent: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div className="col-6 col-md-3">
              <label className="erp-label">TDS % of Gross</label>
              <input
                type="number"
                className="erp-input"
                step="0.1"
                min="0"
                max="50"
                value={company.tds_percent}
                onChange={(e) =>
                  setCompany({
                    ...company,
                    tds_percent: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>
          </div>

          <div
            style={{
              marginTop: 16,
              padding: 14,
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: 10,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#64748b",
                textTransform: "uppercase",
                letterSpacing: 0.5,
                marginBottom: 10,
              }}
            >
              Live Preview — If Total Salary is ₹15,000
            </div>
            <div className="row g-2">
              <div className="col-6 col-md-3">
                <MiniBox label="Basic" value={`₹${previewBasic.toFixed(0)}`} />
              </div>
              <div className="col-6 col-md-3">
                <MiniBox label="HRA" value={`₹${previewHra.toFixed(0)}`} />
              </div>
              <div className="col-6 col-md-3">
                <MiniBox label="Special" value={`₹${previewSpecial.toFixed(0)}`} />
              </div>
              <div className="col-6 col-md-3">
                <MiniBox label="Total" value={`₹${previewTotal}`} highlight />
              </div>
            </div>
          </div>

          <div className="col-12 d-flex justify-content-end mt-3">
            <button
              className="erp-btn erp-btn-primary"
              onClick={handleCompanySave}
              disabled={companySaving}
            >
              <Save size={14} />
              {companySaving ? "Saving..." : "Save Payroll Settings"}
            </button>
          </div>
        </SectionCard>

        {/* ================================================
            NEW: Forgot Logout Settings
            ================================================ */}
        <SectionCard
          icon={ShieldAlert}
          title="Forgot Logout Settings"
          subtitle="Controls for employees who forget to logout"
        >
          <div
            style={{
              padding: 14,
              background: "#fef3c7",
              borderRadius: 10,
              marginBottom: 16,
              border: "1px solid #fde68a",
            }}
          >
            <div style={{ fontSize: 12.5, color: "#92400e", lineHeight: 1.55 }}>
              <strong>How it works:</strong> If an employee forgets to logout,
              they're blocked from next check-in. Employee must request
              approval from their manager. If it exceeds the max allowed times
              per month, a fine is applied to their next payroll.
            </div>
          </div>

          <div className="row g-3">
            <div className="col-12">
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                <input
                  type="checkbox"
                  checked={company.forgot_logout_enabled}
                  onChange={(e) =>
                    setCompany({
                      ...company,
                      forgot_logout_enabled: e.target.checked,
                    })
                  }
                  style={{ width: 18, height: 18, cursor: "pointer" }}
                />
                Enable Forgot-Logout Block
              </label>
              <small style={{ color: "#9ca3af", fontSize: 11, marginLeft: 28 }}>
                When disabled, employees can check-in freely without manager
                approval
              </small>
            </div>

            <div className="col-6 col-md-4">
              <label className="erp-label">Max Per Month (Free)</label>
              <input
                type="number"
                className="erp-input"
                min={0}
                max={10}
                value={company.forgot_logout_max_per_month}
                onChange={(e) =>
                  setCompany({
                    ...company,
                    forgot_logout_max_per_month: parseInt(e.target.value) || 0,
                  })
                }
                style={{ fontFamily: FONT }}
              />
              <small style={{ color: "#9ca3af", fontSize: 11 }}>
                e.g., 3 = first 3 times are free
              </small>
            </div>

            <div className="col-6 col-md-4">
              <label className="erp-label">Fine Amount (₹)</label>
              <input
                type="number"
                className="erp-input"
                min={0}
                step="50"
                value={company.forgot_logout_fine_amount}
                onChange={(e) =>
                  setCompany({
                    ...company,
                    forgot_logout_fine_amount: parseFloat(e.target.value) || 0,
                  })
                }
                style={{ fontFamily: FONT }}
              />
              <small style={{ color: "#9ca3af", fontSize: 11 }}>
                Per additional occurrence
              </small>
            </div>
          </div>

          <div className="col-12 d-flex justify-content-end mt-3">
            <button
              className="erp-btn erp-btn-primary"
              onClick={handleCompanySave}
              disabled={companySaving}
            >
              <Save size={14} />
              {companySaving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </SectionCard>

        {/* PT Slabs */}
        <SectionCard
          icon={Receipt}
          title="Professional Tax Slabs"
          subtitle="6-month gross income based tax slabs (applied once per 6-month period)"
        >
          <div
            style={{
              padding: 14,
              background: "#fef3c7",
              borderRadius: 10,
              marginBottom: 16,
              border: "1px solid #fde68a",
            }}
          >
            <div style={{ fontSize: 12.5, color: "#92400e", lineHeight: 1.55 }}>
              <strong>How it works:</strong> The employee's 6-month gross
              income (Monthly Salary × 6) is matched to one of these slabs.
              The corresponding <strong>Tax Amount</strong> is deducted{" "}
              <strong>once per 6-month period</strong> (Apr & Oct by default).
              Leave <strong>Max Salary</strong> blank for the highest slab.
            </div>
          </div>

          {ptSlabsLoading ? (
            <div
              className="text-center py-4"
              style={{ color: "#6b7280", fontSize: 13 }}
            >
              <div className="spinner-border spinner-border-sm me-2" />
              Loading slabs...
            </div>
          ) : (
            <>
              <div className="table-responsive">
                <table
                  className="table align-middle"
                  style={{ fontSize: 13, marginBottom: 0 }}
                >
                  <thead>
                    <tr
                      style={{
                        background: "#f8fafc",
                        fontSize: 11,
                        color: "#64748b",
                        textTransform: "uppercase",
                        letterSpacing: 0.4,
                      }}
                    >
                      <th style={{ width: 40 }}>#</th>
                      <th>Min Salary (₹)</th>
                      <th>Max Salary (₹)</th>
                      <th>Tax Amount (₹)</th>
                      <th style={{ width: 60 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {ptSlabs.map((slab, idx) => (
                      <tr key={idx}>
                        <td style={{ color: "#94a3b8", fontWeight: 600 }}>
                          {idx + 1}
                        </td>
                        <td>
                          <input
                            type="number"
                            className="erp-input"
                            style={{ padding: "6px 10px", fontSize: 13 }}
                            value={slab.min_salary ?? ""}
                            onChange={(e) =>
                              handlePtSlabChange(idx, "min_salary", e.target.value)
                            }
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            className="erp-input"
                            style={{ padding: "6px 10px", fontSize: 13 }}
                            placeholder="Above (no limit)"
                            value={
                              slab.max_salary === null ||
                              slab.max_salary === undefined
                                ? ""
                                : slab.max_salary
                            }
                            onChange={(e) =>
                              handlePtSlabChange(idx, "max_salary", e.target.value)
                            }
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            className="erp-input"
                            style={{
                              padding: "6px 10px",
                              fontSize: 13,
                              fontWeight: 700,
                              color: "#4f46e5",
                            }}
                            value={slab.tax_amount ?? 0}
                            onChange={(e) =>
                              handlePtSlabChange(idx, "tax_amount", e.target.value)
                            }
                          />
                        </td>
                        <td>
                          <button
                            type="button"
                            onClick={() => handleRemovePtSlab(idx)}
                            title="Remove slab"
                            style={{
                              background: "#fee2e2",
                              border: "none",
                              color: "#dc2626",
                              borderRadius: 8,
                              padding: "6px 10px",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {ptSlabs.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="text-center"
                          style={{ color: "#9ca3af", padding: 20 }}
                        >
                          No slabs configured. Click "Add Slab" below.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="d-flex justify-content-between mt-3" style={{ gap: 10 }}>
                <button
                  type="button"
                  className="erp-btn erp-btn-outline"
                  onClick={handleAddPtSlab}
                >
                  <Plus size={14} /> Add Slab
                </button>
                <button
                  type="button"
                  className="erp-btn erp-btn-primary"
                  onClick={handlePtSlabsSave}
                  disabled={ptSlabsSaving}
                >
                  <Save size={14} />
                  {ptSlabsSaving ? "Saving..." : "Save PT Slabs"}
                </button>
              </div>
            </>
          )}
        </SectionCard>

        {/* Personal Account */}
        <SectionCard
          icon={User}
          title="Personal Account"
          subtitle="Update your login credentials"
        >
          <div style={{ marginBottom: 24 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                marginBottom: 10,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Mail size={14} color="#4f46e5" /> Email Address
            </div>

            <div className="row g-3">
              <div className="col-12 col-md-6">
                <label className="erp-label">Current Email</label>
                <input
                  className="erp-input"
                  value={email}
                  disabled
                  style={{ background: "#f9fafb", color: "#6b7280" }}
                />
              </div>
              <div className="col-12 col-md-6">
                <label className="erp-label">New Email</label>
                <input
                  type="email"
                  className="erp-input"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
              </div>
              <div className="col-12 col-md-6">
                <label className="erp-label">
                  Current Password (for verification)
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showEmailPwd ? "text" : "password"}
                    className="erp-input"
                    value={emailPassword}
                    onChange={(e) => setEmailPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowEmailPwd(!showEmailPwd)}
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
                    {showEmailPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div className="col-12 col-md-6 d-flex align-items-end">
                <button
                  className="erp-btn erp-btn-outline w-100"
                  onClick={handleEmailSave}
                  disabled={emailSaving}
                  style={{ justifyContent: "center" }}
                >
                  <Save size={14} />
                  {emailSaving ? "Saving..." : "Update Email"}
                </button>
              </div>
            </div>
          </div>

          <div style={{ paddingTop: 20, borderTop: "1px solid var(--border)" }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                marginBottom: 10,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Lock size={14} color="#4f46e5" /> Change Password
            </div>

            <div className="row g-3">
              <div className="col-12 col-md-4">
                <label className="erp-label">Current Password</label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showCurrentPwd ? "text" : "password"}
                    className="erp-input"
                    value={currentPwd}
                    onChange={(e) => setCurrentPwd(e.target.value)}
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
              <div className="col-12 col-md-4">
                <label className="erp-label">New Password</label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showNewPwd ? "text" : "password"}
                    className="erp-input"
                    value={newPwd}
                    onChange={(e) => setNewPwd(e.target.value)}
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
              <div className="col-12 col-md-4">
                <label className="erp-label">Confirm New Password</label>
                <input
                  type="password"
                  className="erp-input"
                  value={confirmPwd}
                  onChange={(e) => setConfirmPwd(e.target.value)}
                />
              </div>
              <div className="col-12 d-flex justify-content-end">
                <button
                  className="erp-btn erp-btn-primary"
                  onClick={handlePasswordSave}
                  disabled={pwdSaving}
                >
                  <Lock size={14} />
                  {pwdSaving ? "Updating..." : "Change Password"}
                </button>
              </div>
            </div>

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
                After changing email or password, you'll be{" "}
                <strong>logged out</strong> and need to login again.
              </div>
            </div>
          </div>
        </SectionCard>

        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </div>

      {/* Shift Add/Edit Modal */}
      {shiftModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
          onClick={() => setShiftModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "white",
              borderRadius: 14,
              padding: 24,
              maxWidth: 480,
              width: "90%",
              fontFamily: FONT,
            }}
          >
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
              {editShift ? "Edit Shift" : "Add Shift"}
            </h3>

            <div className="mb-3">
              <label className="erp-label">Shift Name *</label>
              <input
                className="erp-input"
                value={shiftForm.name}
                onChange={(e) =>
                  setShiftForm({ ...shiftForm, name: e.target.value })
                }
                placeholder="e.g., Morning Shift"
              />
            </div>

            <div className="row g-3 mb-3">
              <div className="col-6">
                <label className="erp-label">Start Time *</label>
                <input
                  type="time"
                  className="erp-input"
                  value={shiftForm.start_time}
                  onChange={(e) =>
                    setShiftForm({ ...shiftForm, start_time: e.target.value })
                  }
                />
              </div>
              <div className="col-6">
                <label className="erp-label">End Time *</label>
                <input
                  type="time"
                  className="erp-input"
                  value={shiftForm.end_time}
                  onChange={(e) =>
                    setShiftForm({ ...shiftForm, end_time: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="mb-3">
              <label className="erp-label">Grace Period (Minutes)</label>
              <input
                type="number"
                className="erp-input"
                value={shiftForm.grace_period_minutes}
                onChange={(e) =>
                  setShiftForm({
                    ...shiftForm,
                    grace_period_minutes: parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>

            <div className="d-flex justify-content-end gap-2">
              <button
                className="erp-btn erp-btn-outline"
                onClick={() => setShiftModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className="erp-btn erp-btn-primary"
                onClick={handleShiftSave}
                disabled={shiftSaving}
              >
                {shiftSaving ? "Saving..." : editShift ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default ManagerSettings;