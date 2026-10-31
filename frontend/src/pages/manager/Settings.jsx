import { getFullFileUrl } from '../../utils/apiUrl';
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
  Shield,
} from "lucide-react";
import Layout from "../../components/layout/Layout";
import Toast from "../../components/common/Toast";
import * as api from "../../api/settingsApi";
import * as shiftApi from "../../api/shiftApi";
import * as insuranceApi from "../../api/insuranceApi";

const FONT = "'Inter', 'Segoe UI', -apple-system, sans-serif";

const WORKING_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const formatTime12 = (t) => {
  if (!t) return "�";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ampm}`;
};

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return isMobile;
};

// ============================================
// ?? 12-HOUR TIME PICKER � Railway Style
// ============================================
const TimePicker12 = ({ value, onChange, label, required }) => {
  const to12 = (time24) => {
    if (!time24) return { hour: "12", minute: "00", ampm: "AM" };
    const [h, m] = time24.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return {
      hour: String(h12).padStart(2, "0"),
      minute: String(m).padStart(2, "0"),
      ampm,
    };
  };

  const to24 = (h12, minute, ampm) => {
    let h = parseInt(h12, 10);
    if (ampm === "PM" && h !== 12) h += 12;
    if (ampm === "AM" && h === 12) h = 0;
    return `${String(h).padStart(2, "0")}:${minute}`;
  };

  const { hour, minute, ampm } = to12(value);

  return (
    <div>
      <label className="erp-label">
        {label} {required && "*"}
      </label>
      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
        {/* Hour */}
        <select
          className="erp-input"
          value={hour}
          onChange={(e) => onChange(to24(e.target.value, minute, ampm))}
          style={{ width: "65px", padding: "8px 4px", fontFamily: FONT, textAlign: "center" }}
        >
          {Array.from({ length: 12 }, (_, i) => {
            const h = String(i + 1).padStart(2, "0");
            return (
              <option key={h} value={h}>
                {h}
              </option>
            );
          })}
        </select>

        <span style={{ fontWeight: 700, color: "#6b7280" }}>:</span>

        {/* Minute � 5-min increments */}
        <select
          className="erp-input"
          value={minute}
          onChange={(e) => onChange(to24(hour, e.target.value, ampm))}
          style={{ width: "65px", padding: "8px 4px", fontFamily: FONT, textAlign: "center" }}
        >
          {["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"].map(
            (m) => (
              <option key={m} value={m}>
                {m}
              </option>
            )
          )}
        </select>

        {/* AM/PM */}
        <select
          className="erp-input"
          value={ampm}
          onChange={(e) => onChange(to24(hour, minute, e.target.value))}
          style={{
            width: "70px",
            padding: "8px 4px",
            fontFamily: FONT,
            fontWeight: 700,
            textAlign: "center",
          }}
        >
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
      </div>
    </div>
  );
};

const SectionCard = ({ icon: Icon, title, subtitle, children }) => (
  <div className="erp-card settings-section-card">
    <div className="settings-section-head">
      <div className="settings-section-icon">
        <Icon size={20} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div className="settings-section-title">{title}</div>
        {subtitle && <div className="settings-section-sub">{subtitle}</div>}
      </div>
    </div>
    {children}
  </div>
);

const MiniBox = ({ label, value, highlight }) => (
  <div className="settings-minibox">
    <div className="settings-minibox-label">{label}</div>
    <div
      className="settings-minibox-value"
      style={{ color: highlight ? "#4f46e5" : "#0f172a" }}
    >
      {value}
    </div>
  </div>
);

const InfoBanner = ({ tone = "blue", children }) => {
  const tones = {
    blue: { bg: "#eef2ff", border: "#c7d2fe", color: "#3730a3" },
    cyan: { bg: "#ecfeff", border: "#a5f3fc", color: "#155e75" },
    green: { bg: "#f0fdf4", border: "#bbf7d0", color: "#166534" },
    amber: { bg: "#fef3c7", border: "#fde68a", color: "#92400e" },
    sky: { bg: "#f0f9ff", border: "#bae6fd", color: "#0c4a6e" },
  };
  const t = tones[tone] || tones.blue;
  return (
    <div
      className="settings-info-banner"
      style={{ background: t.bg, border: `1px solid ${t.border}`, color: t.color }}
    >
      <div className="settings-info-banner-text">{children}</div>
    </div>
  );
};

const Modal = ({ open, onClose, title, children, footer }) => {
  if (!open) return null;
  return (
    <div className="settings-modal-backdrop" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="settings-modal-title">{title}</h3>
        <div className="settings-modal-body">{children}</div>
        <div className="settings-modal-footer">{footer}</div>
      </div>
    </div>
  );
};

const ManagerSettings = () => {
  const [toast, setToast] = useState(null);
  const isMobile = useIsMobile();

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
    pt_deduction_months: [4, 10],
    notice_period_days: 15,
    // ? NEW: Location settings defaults
    company_latitude: "10.794941",
    company_longitude: "78.680983",
    allowed_radius_meters: 200,
  });
  const [companyLoading, setCompanyLoading] = useState(true);
  const [companySaving, setCompanySaving] = useState(false);

  // PT Slabs
  const [ptSlabs, setPtSlabs] = useState([]);
  const [ptSlabsLoading, setPtSlabsLoading] = useState(true);
  const [ptSlabsSaving, setPtSlabsSaving] = useState(false);

  // Shifts
  const [shifts, setShifts] = useState([]);
  const [shiftsLoading, setShiftsLoading] = useState(true);
  const [shiftModalOpen, setShiftModalOpen] = useState(false);
  const [editShift, setEditShift] = useState(null);
  
  const [shiftForm, setShiftForm] = useState({
    name: "",
    start_time: "09:30",
    end_time: "17:30",
    start_time_2: "",
    end_time_2: "",
    grace_period_minutes: 15,
  });
  
  const [shiftSaving, setShiftSaving] = useState(false);

  // Insurance
  const [insurances, setInsurances] = useState([]);
  const [insurancesLoading, setInsurancesLoading] = useState(true);
  const [insuranceModalOpen, setInsuranceModalOpen] = useState(false);
  const [editInsurance, setEditInsurance] = useState(null);
  const [insuranceForm, setInsuranceForm] = useState({
    name: "",
    annual_amount: "",
    description: "",
  });
  const [insuranceSaving, setInsuranceSaving] = useState(false);

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
      insuranceApi.listInsurances(),
    ])
      .then(([cRes, aRes, ptRes, shRes, insRes]) => {
        setCompany((prev) => ({ ...prev, ...cRes.data }));
        setEmail(aRes.data.email || "");
        setNewEmail(aRes.data.email || "");
        setPtSlabs(ptRes.data || []);
        setShifts(Array.isArray(shRes.data) ? shRes.data : []);
        setInsurances(Array.isArray(insRes.data) ? insRes.data : []);
      })
      .catch((e) => console.error(e))
      .finally(() => {
        setCompanyLoading(false);
        setPtSlabsLoading(false);
        setShiftsLoading(false);
        setInsurancesLoading(false);
      });
  }, []);

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

  const getLogoUrl = (url) => getFullFileUrl(url);

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
      start_time_2: "",
      end_time_2: "",
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
      start_time_2: s.start_time_2 || "",
      end_time_2: s.end_time_2 || "",
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

  // Insurance handlers
  const openAddInsurance = () => {
    setEditInsurance(null);
    setInsuranceForm({ name: "", annual_amount: "", description: "" });
    setInsuranceModalOpen(true);
  };

  const openEditInsurance = (ins) => {
    setEditInsurance(ins);
    setInsuranceForm({
      name: ins.name,
      annual_amount: ins.annual_amount,
      description: ins.description || "",
    });
    setInsuranceModalOpen(true);
  };

  const handleInsuranceSave = async () => {
    if (!insuranceForm.name.trim()) {
      setToast({ message: "Insurance name required", type: "error" });
      return;
    }
    if (
      !insuranceForm.annual_amount ||
      parseFloat(insuranceForm.annual_amount) < 0
    ) {
      setToast({ message: "Valid annual amount required", type: "error" });
      return;
    }

    setInsuranceSaving(true);
    try {
      const payload = {
        ...insuranceForm,
        annual_amount: parseFloat(insuranceForm.annual_amount),
      };
      if (editInsurance) {
        await insuranceApi.updateInsurance(editInsurance._id, payload);
        setToast({ message: "Insurance updated!", type: "success" });
      } else {
        await insuranceApi.createInsurance(payload);
        setToast({ message: "Insurance created!", type: "success" });
      }
      const res = await insuranceApi.listInsurances();
      setInsurances(Array.isArray(res.data) ? res.data : []);
      setInsuranceModalOpen(false);
    } catch (err) {
      setToast({
        message: err.response?.data?.error || "Failed to save",
        type: "error",
      });
    } finally {
      setInsuranceSaving(false);
    }
  };

  const handleInsuranceDelete = async (ins) => {
    if (!window.confirm(`Delete "${ins.name}"?`)) return;
    try {
      await insuranceApi.deleteInsurance(ins._id);
      setToast({ message: "Insurance deleted", type: "success" });
      const res = await insuranceApi.listInsurances();
      setInsurances(Array.isArray(res.data) ? res.data : []);
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

  const togglePTMonth = (monthNum) => {
    setCompany((c) => {
      const current = c.pt_deduction_months || [];
      const updated = current.includes(monthNum)
        ? current.filter((m) => m !== monthNum)
        : [...current, monthNum].sort((a, b) => a - b);
      return { ...c, pt_deduction_months: updated };
    });
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

  const isSplitShift = shiftForm.name.toLowerCase().includes("custom");

  return (
    <Layout>
      <style>{`
        .settings-page * { font-family: ${FONT}; }
        /* ? FIX: Max-width and margin auto ah remove panni, full width ah maathiiruken */
        .settings-page {
          font-family: ${FONT};
          width: 100%;
          padding: 0 20px;
        }
        .settings-section-card {
          padding: 22px;
          margin-bottom: 20px;
        }
        .settings-section-head {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 18px;
          padding-bottom: 14px;
          border-bottom: 1px solid var(--border);
        }
        .settings-section-icon {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          background: #eef2ff;
          color: #4f46e5;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .settings-section-title {
          font-weight: 700;
          font-size: 15px;
        }
        .settings-section-sub {
          font-size: 12.5px;
          color: #6b7280;
          margin-top: 2px;
        }
        .settings-info-banner {
          padding: 12px 14px;
          border-radius: 10px;
          margin-bottom: 16px;
        }
        .settings-info-banner-text {
          font-size: 12.5px;
          line-height: 1.55;
        }
        .settings-minibox {
          padding: 8px 10px;
          background: white;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          text-align: center;
        }
        .settings-minibox-label {
          font-size: 9.5px;
          font-weight: 700;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.4px;
          margin-bottom: 3px;
        }
        .settings-minibox-value {
          font-size: 13px;
          font-weight: 800;
          letter-spacing: -0.2px;
        }
        .settings-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 16px;
        }
        .settings-modal {
          background: white;
          border-radius: 14px;
          padding: 24px;
          max-width: 480px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          font-family: ${FONT};
        }
        .settings-modal-title {
          font-size: 16px;
          font-weight: 700;
          margin-bottom: 16px;
        }
        .settings-modal-body { padding-bottom: 4px; }
        .settings-modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 8px;
        }

        @media (max-width: 767px) {
          .settings-section-card { padding: 16px; margin-bottom: 14px; }
          .settings-section-icon { width: 36px; height: 36px; border-radius: 10px; }
          .settings-section-icon svg { width: 17px; height: 17px; }
          .settings-section-title { font-size: 14px; }
          .settings-section-sub { font-size: 11.5px; }
          .settings-minibox { padding: 6px 6px; }
          .settings-minibox-value { font-size: 12px; }
          .settings-modal { padding: 18px; border-radius: 12px; }
          .settings-modal-title { font-size: 15px; }
          .settings-modal-footer { flex-direction: column-reverse; }
          .settings-modal-footer .erp-btn { width: 100%; justify-content: center; }
          .settings-page .erp-btn { justify-content: center; }
        }

        .settings-card-list { display: flex; flex-direction: column; gap: 10px; }
        .settings-mini-card {
          padding: 12px;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          background: #fff;
        }
        .settings-mini-card-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 8px;
          margin-bottom: 8px;
        }
        .settings-mini-card-title {
          font-weight: 700;
          font-size: 13.5px;
          color: #0f172a;
        }
        .settings-mini-card-sub {
          font-size: 11.5px;
          color: #94a3b8;
          margin-top: 2px;
        }
        .settings-mini-card-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 6px 0;
          font-size: 12.5px;
          border-top: 1px dashed #f1f5f9;
        }
        .settings-mini-card-row:first-of-type { border-top: none; }
        .settings-mini-card-label {
          color: #64748b;
          font-weight: 500;
        }
        .settings-mini-card-value {
          font-weight: 700;
          color: #0f172a;
        }
        .settings-mini-card-actions {
          display: flex;
          gap: 8px;
          margin-top: 10px;
        }
        .settings-icon-btn {
          border: none;
          border-radius: 8px;
          padding: 7px 10px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 12px;
          font-weight: 600;
        }

        .settings-month-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .settings-month-btn {
          padding: 8px 14px;
          font-size: 12.5px;
          min-width: 56px;
          justify-content: center;
          font-weight: 600;
        }
        @media (max-width: 480px) {
          .settings-month-btn {
            flex: 1 1 calc(33.333% - 8px);
            min-width: 0;
            padding: 8px 6px;
            font-size: 12px;
          }
        }

        .settings-day-grid { display: flex; flex-wrap: wrap; gap: 8px; }
        .settings-day-btn {
          padding: 8px 16px;
          font-size: 12.5px;
          min-width: 60px;
          justify-content: center;
        }
        @media (max-width: 480px) {
          .settings-day-btn {
            flex: 1 1 calc(25% - 8px);
            min-width: 0;
            padding: 8px 6px;
            font-size: 12px;
          }
        }

        @media (max-width: 767px) {
          .settings-page .erp-page-title { font-size: 22px; }
          .settings-page .erp-page-subtitle { font-size: 12.5px; }
        }
      `}</style>

      <div className="settings-page">
        <div className="mb-4">
          <h1 className="erp-page-title">Settings</h1>
          <p className="erp-page-subtitle mb-0">
            Manage your account and company preferences
          </p>
        </div>

        {/* COMPANY SETTINGS */}
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
              <div className="d-flex align-items-center gap-3 flex-wrap">
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
                <div style={{ minWidth: 0, flex: 1 }}>
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
                  >
                    <Upload size={14} />
                    {uploadingLogo ? "Uploading..." : "Upload Logo"}
                  </button>
                  <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 6 }}>
                    PNG, JPG, SVG � Max 2MB
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
            <div className="col-12 col-md-6">
              <label className="erp-label">Notice Period (Days)</label>
              <input
                type="number"
                className="erp-input"
                min={1}
                max={180}
                value={company.notice_period_days || 15}
                onChange={(e) =>
                  setCompany({
                    ...company,
                    notice_period_days: parseInt(e.target.value) || 15,
                  })
                }
                style={{ fontFamily: FONT }}
              />
              <small style={{ color: "#9ca3af", fontSize: 11 }}>
                Minimum notice period for employee resignations
              </small>
              {company.notice_period_days > 0 && (
                <div
                  style={{
                    marginTop: 6,
                    fontSize: 11,
                    color: "#4f46e5",
                    fontWeight: 600,
                    fontFamily: FONT,
                  }}
                >
                  ?? Employees must serve {company.notice_period_days} days from
                  resignation date
                </div>
              )}
            </div>

            {/* ? NEW: Location Settings */}
            <div className="col-12 mt-3">
              <div
                style={{
                  padding: 14,
                  background: "#f0f9ff",
                  borderRadius: 10,
                  border: "1px solid #bae6fd",
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#0369a1",
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                    marginBottom: 10,
                  }}
                >
                  ?? Office Location (Geo-fencing)
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "#0c4a6e",
                    marginBottom: 12,
                    lineHeight: 1.5,
                  }}
                >
                  Employees can only check-in from within this radius.
                </div>
                <div className="row g-3">
                  <div className="col-12 col-md-4">
                    <label className="erp-label">Company Latitude</label>
                    <input
                      type="number"
                      step="0.000001"
                      className="erp-input"
                      value={company.company_latitude || ""}
                      onChange={(e) =>
                        setCompany({ ...company, company_latitude: e.target.value })
                      }
                      placeholder="e.g., 10.794941"
                    />
                  </div>
                  <div className="col-12 col-md-4">
                    <label className="erp-label">Company Longitude</label>
                    <input
                      type="number"
                      step="0.000001"
                      className="erp-input"
                      value={company.company_longitude || ""}
                      onChange={(e) =>
                        setCompany({ ...company, company_longitude: e.target.value })
                      }
                      placeholder="e.g., 78.680983"
                    />
                  </div>
                  <div className="col-12 col-md-4">
                    <label className="erp-label">Allowed Radius (Meters)</label>
                    <input
                      type="number"
                      className="erp-input"
                      value={company.allowed_radius_meters || ""}
                      onChange={(e) =>
                        setCompany({
                          ...company,
                          allowed_radius_meters: parseInt(e.target.value) || 0,
                        })
                      }
                      placeholder="e.g., 200"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="col-12">
              <label className="erp-label">Working Days</label>
              <div className="settings-day-grid">
                {WORKING_DAYS.map((d) => {
                  const active = company.working_days.includes(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => toggleDay(d)}
                      className="erp-btn settings-day-btn"
                      style={{
                        background: active ? "var(--primary)" : "white",
                        color: active ? "white" : "#6b7280",
                        border: `1px solid ${
                          active ? "var(--primary)" : "#e5e7eb"
                        }`,
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

        {/* SHIFT MANAGEMENT */}
        <SectionCard
          icon={Clock}
          title="Shift Management"
          subtitle="Define work shifts and assign to employees"
        >
          <InfoBanner tone="cyan">
            <strong>How it works:</strong> Create shifts with start/end times.
            Assign a shift to each employee. Attendance late/early calculations
            use the employee's assigned shift.
          </InfoBanner>

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
              {isMobile ? (
                <div className="settings-card-list">
                  {shifts.map((s, idx) => (
                    <div key={s._id} className="settings-mini-card">
                      <div className="settings-mini-card-head">
                        <div>
                          <div className="settings-mini-card-title">
                            {idx + 1}. {s.name}
                          </div>
                        </div>
                        <div className="settings-mini-card-actions">
                          <button
                            type="button"
                            className="settings-icon-btn"
                            onClick={() => openEditShift(s)}
                            style={{ background: "#eef2ff", color: "#4f46e5" }}
                          >
                            <Pencil size={12} /> Edit
                          </button>
                          <button
                            type="button"
                            className="settings-icon-btn"
                            onClick={() => handleShiftDelete(s)}
                            style={{ background: "#fee2e2", color: "#dc2626" }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                      <div className="settings-mini-card-row">
                        <span className="settings-mini-card-label">Start</span>
                        <span className="settings-mini-card-value">
                          {formatTime12(s.start_time)}
                        </span>
                      </div>
                      <div className="settings-mini-card-row">
                        <span className="settings-mini-card-label">End</span>
                        <span className="settings-mini-card-value">
                          {formatTime12(s.end_time)}
                        </span>
                      </div>
                      <div className="settings-mini-card-row">
                        <span className="settings-mini-card-label">
                          Grace Period
                        </span>
                        <span className="settings-mini-card-value">
                          {s.grace_period_minutes} min
                        </span>
                      </div>
                    </div>
                  ))}
                  {shifts.length === 0 && (
                    <div
                      className="text-center"
                      style={{ color: "#9ca3af", padding: 20, fontSize: 13 }}
                    >
                      No shifts yet. Click "Add Shift".
                    </div>
                  )}
                </div>
              ) : (
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
              )}

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

        {/* INSURANCE MANAGEMENT */}
        <SectionCard
          icon={Shield}
          title="Insurance Management"
          subtitle="Define insurance types and assign to employees"
        >
          <InfoBanner tone="green">
            <strong>How it works:</strong> Create insurance types with annual
            amount. Assign insurance to employee when adding. Monthly premium
            auto-calculated (Annual � 12) and deducted in payroll.
          </InfoBanner>

          {insurancesLoading ? (
            <div
              className="text-center py-4"
              style={{ color: "#6b7280", fontSize: 13 }}
            >
              <div className="spinner-border spinner-border-sm me-2" />
              Loading insurances...
            </div>
          ) : (
            <>
              {isMobile ? (
                <div className="settings-card-list">
                  {insurances.map((ins, idx) => (
                    <div key={ins._id} className="settings-mini-card">
                      <div className="settings-mini-card-head">
                        <div style={{ minWidth: 0 }}>
                          <div className="settings-mini-card-title">
                            {idx + 1}. {ins.name}
                          </div>
                          {ins.description && (
                            <div className="settings-mini-card-sub">
                              {ins.description}
                            </div>
                          )}
                        </div>
                        <div className="settings-mini-card-actions">
                          <button
                            type="button"
                            className="settings-icon-btn"
                            onClick={() => openEditInsurance(ins)}
                            style={{ background: "#eef2ff", color: "#4f46e5" }}
                          >
                            <Pencil size={12} /> Edit
                          </button>
                          <button
                            type="button"
                            className="settings-icon-btn"
                            onClick={() => handleInsuranceDelete(ins)}
                            style={{ background: "#fee2e2", color: "#dc2626" }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                      <div className="settings-mini-card-row">
                        <span className="settings-mini-card-label">
                          Annual
                        </span>
                        <span className="settings-mini-card-value">
                          ?
                          {Number(ins.annual_amount || 0).toLocaleString(
                            "en-IN"
                          )}
                        </span>
                      </div>
                      <div className="settings-mini-card-row">
                        <span className="settings-mini-card-label">
                          Monthly
                        </span>
                        <span
                          className="settings-mini-card-value"
                          style={{ color: "#059669" }}
                        >
                          ?
                          {(Number(ins.annual_amount || 0) / 12).toLocaleString(
                            "en-IN",
                            { maximumFractionDigits: 2 }
                          )}
                        </span>
                      </div>
                      <div className="settings-mini-card-row">
                        <span className="settings-mini-card-label">
                          Employees
                        </span>
                        <span className="erp-badge erp-badge-blue">
                          {ins.employee_count || 0}
                        </span>
                      </div>
                    </div>
                  ))}
                  {insurances.length === 0 && (
                    <div
                      className="text-center"
                      style={{ color: "#9ca3af", padding: 20, fontSize: 13 }}
                    >
                      No insurances yet. Click "Add Insurance".
                    </div>
                  )}
                </div>
              ) : (
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
                        <th>Name</th>
                        <th>Annual Amount</th>
                        <th>Monthly</th>
                        <th>Employees</th>
                        <th style={{ width: 100 }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {insurances.map((ins, idx) => (
                        <tr key={ins._id}>
                          <td style={{ color: "#94a3b8", fontWeight: 600 }}>
                            {idx + 1}
                          </td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{ins.name}</div>
                            {ins.description && (
                              <div
                                style={{
                                  fontSize: 11.5,
                                  color: "#94a3b8",
                                  marginTop: 2,
                                }}
                              >
                                {ins.description}
                              </div>
                            )}
                          </td>
                          <td style={{ fontWeight: 600, color: "#0f172a" }}>
                            ?
                            {Number(ins.annual_amount || 0).toLocaleString(
                              "en-IN"
                            )}
                          </td>
                          <td style={{ fontWeight: 600, color: "#059669" }}>
                            ?
                            {(
                              Number(ins.annual_amount || 0) / 12
                            ).toLocaleString("en-IN", {
                              maximumFractionDigits: 2,
                            })}
                          </td>
                          <td>
                            <span className="erp-badge erp-badge-blue">
                              {ins.employee_count || 0}
                            </span>
                          </td>
                          <td>
                            <div className="d-flex gap-1">
                              <button
                                type="button"
                                onClick={() => openEditInsurance(ins)}
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
                                onClick={() => handleInsuranceDelete(ins)}
                                title="Delete"
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
                      {insurances.length === 0 && (
                        <tr>
                          <td
                            colSpan={6}
                            className="text-center"
                            style={{ color: "#9ca3af", padding: 20 }}
                          >
                            No insurances yet. Click "Add Insurance".
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="d-flex justify-content-end mt-3">
                <button
                  type="button"
                  className="erp-btn erp-btn-primary"
                  onClick={openAddInsurance}
                >
                  <Plus size={14} /> Add Insurance
                </button>
              </div>
            </>
          )}
        </SectionCard>

        {/* PAYROLL STRUCTURE */}
        <SectionCard
          icon={Wallet}
          title="Payroll Structure"
          subtitle="Salary breakup applied to all employees"
        >
          <InfoBanner tone="blue">
            <strong>How it works:</strong> When you add an employee, enter only
            their <strong>Total Monthly Salary</strong>. The system
            auto-calculates Basic, HRA, Special Allowance, and Professional Tax
            using these settings.
          </InfoBanner>

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

            {/* PT DEDUCTION MONTHS */}
            <div className="col-12">
              <div
                style={{
                  marginTop: 8,
                  padding: 14,
                  background: "#f0f9ff",
                  borderRadius: 10,
                  border: "1px solid #bae6fd",
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#0369a1",
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                    marginBottom: 6,
                  }}
                >
                  ?? PT Deduction Months
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "#0c4a6e",
                    marginBottom: 12,
                    lineHeight: 1.5,
                  }}
                >
                  Professional Tax will be deducted{" "}
                  <strong>only in these months</strong> (6-month cycle).
                  Default: <strong>April</strong> and <strong>October</strong>.
                </div>

                <div className="settings-month-grid">
                  {MONTHS_SHORT.map((label, idx) => {
                    const monthNum = idx + 1;
                    const active = (
                      company.pt_deduction_months || []
                    ).includes(monthNum);
                    return (
                      <button
                        key={monthNum}
                        type="button"
                        onClick={() => togglePTMonth(monthNum)}
                        className="erp-btn settings-month-btn"
                        style={{
                          background: active ? "#0369a1" : "white",
                          color: active ? "white" : "#0369a1",
                          border: `1px solid ${
                            active ? "#0369a1" : "#bae6fd"
                          }`,
                        }}
                      >
                        {active && "? "}
                        {label}
                      </button>
                    );
                  })}
                </div>

                {(company.pt_deduction_months || []).length === 0 && (
                  <div
                    style={{
                      marginTop: 10,
                      padding: 8,
                      background: "#fef2f2",
                      borderRadius: 6,
                      border: "1px solid #fecaca",
                      fontSize: 11.5,
                      color: "#991b1b",
                    }}
                  >
                    ? At least one month must be selected for PT deduction.
                  </div>
                )}
              </div>
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
              Live Preview � If Total Salary is ?15,000
            </div>
            <div className="row g-2">
              <div className="col-6 col-md-3">
                <MiniBox label="Basic" value={`?${previewBasic.toFixed(0)}`} />
              </div>
              <div className="col-6 col-md-3">
                <MiniBox label="HRA" value={`?${previewHra.toFixed(0)}`} />
              </div>
              <div className="col-6 col-md-3">
                <MiniBox
                  label="Special"
                  value={`?${previewSpecial.toFixed(0)}`}
                />
              </div>
              <div className="col-6 col-md-3">
                <MiniBox label="Total" value={`?${previewTotal}`} highlight />
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

        {/* PT SLABS */}
        <SectionCard
          icon={Receipt}
          title="Professional Tax Slabs"
          subtitle="6-month gross income based tax slabs (applied once per 6-month period)"
        >
          <InfoBanner tone="amber">
            <strong>How it works:</strong> The employee's 6-month gross income
            (Monthly Salary � 6) is matched to one of these slabs. The
            corresponding <strong>Tax Amount</strong> is deducted{" "}
            <strong>once per 6-month period</strong> (Apr & Oct by default).
            Leave <strong>Max Salary</strong> blank for the highest slab.
          </InfoBanner>

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
              {isMobile ? (
                <div className="settings-card-list">
                  {ptSlabs.map((slab, idx) => (
                    <div key={idx} className="settings-mini-card">
                      <div className="settings-mini-card-head">
                        <div className="settings-mini-card-title">
                          Slab {idx + 1}
                        </div>
                        <button
                          type="button"
                          className="settings-icon-btn"
                          onClick={() => handleRemovePtSlab(idx)}
                          style={{ background: "#fee2e2", color: "#dc2626" }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>

                      <div className="mb-2">
                        <label className="erp-label">Min Salary (?)</label>
                        <input
                          type="number"
                          className="erp-input"
                          style={{ padding: "6px 10px", fontSize: 13 }}
                          value={slab.min_salary ?? ""}
                          onChange={(e) =>
                            handlePtSlabChange(idx, "min_salary", e.target.value)
                          }
                        />
                      </div>

                      <div className="mb-2">
                        <label className="erp-label">Max Salary (?)</label>
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
                      </div>

                      <div>
                        <label className="erp-label">Tax Amount (?)</label>
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
                      </div>
                    </div>
                  ))}
                  {ptSlabs.length === 0 && (
                    <div
                      className="text-center"
                      style={{ color: "#9ca3af", padding: 20, fontSize: 13 }}
                    >
                      No slabs configured. Click "Add Slab" below.
                    </div>
                  )}
                </div>
              ) : (
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
                        <th>Min Salary (?)</th>
                        <th>Max Salary (?)</th>
                        <th>Tax Amount (?)</th>
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
                                handlePtSlabChange(
                                  idx,
                                  "min_salary",
                                  e.target.value
                                )
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
                                handlePtSlabChange(
                                  idx,
                                  "max_salary",
                                  e.target.value
                                )
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
                                handlePtSlabChange(
                                  idx,
                                  "tax_amount",
                                  e.target.value
                                )
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
              )}

              <div
                className="d-flex justify-content-between mt-3 flex-wrap"
                style={{ gap: 10 }}
              >
                <button
                  type="button"
                  className="erp-btn erp-btn-outline"
                  onClick={handleAddPtSlab}
                  style={{ flex: isMobile ? "1 1 100%" : "0 0 auto" }}
                >
                  <Plus size={14} /> Add Slab
                </button>
                <button
                  type="button"
                  className="erp-btn erp-btn-primary"
                  onClick={handlePtSlabsSave}
                  disabled={ptSlabsSaving}
                  style={{ flex: isMobile ? "1 1 100%" : "0 0 auto" }}
                >
                  <Save size={14} />
                  {ptSlabsSaving ? "Saving..." : "Save PT Slabs"}
                </button>
              </div>
            </>
          )}
        </SectionCard>

        {/* PERSONAL ACCOUNT */}
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

      {/* SHIFT MODAL */}
      <Modal
        open={shiftModalOpen}
        onClose={() => setShiftModalOpen(false)}
        title={editShift ? "Edit Shift" : "Add Shift"}
        footer={
          <>
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
          </>
        }
      >
        <div className="mb-3">
          <label className="erp-label">Shift Name *</label>
          <input
            className="erp-input"
            value={shiftForm.name}
            onChange={(e) => setShiftForm({ ...shiftForm, name: e.target.value })}
            placeholder="e.g., Morning Shift or Custom Shift"
          />
          <small style={{ color: "#9ca3af", fontSize: 11, display: "block", marginTop: 4 }}>
            Tip: Type "Custom Shift" to enable 2nd time slot (Split Shift).
          </small>
        </div>

        {/* ? 1st Time slot */}
        <div className="row g-3 mb-3">
          <div className="col-12 col-sm-6">
            <TimePicker12
              label="Start Time 1"
              required
              value={shiftForm.start_time}
              onChange={(val) => setShiftForm({ ...shiftForm, start_time: val })}
            />
          </div>
          <div className="col-12 col-sm-6">
            <TimePicker12
              label="End Time 1"
              required
              value={shiftForm.end_time}
              onChange={(val) => setShiftForm({ ...shiftForm, end_time: val })}
            />
          </div>
        </div>

        {/* ? 2nd Time slot (Only if Custom Shift) */}
        {isSplitShift && (
          <div className="row g-3 mb-3" style={{ padding: 12, background: "#eef2ff", borderRadius: 8, border: "1px dashed #c7d2fe" }}>
            <div className="col-12" style={{ fontSize: 12, fontWeight: 700, color: "#3730a3", marginBottom: 4 }}>
              ?? Split Shift (2nd Time Slot)
            </div>
            <div className="col-12 col-sm-6">
              <TimePicker12
                label="Start Time 2"
                value={shiftForm.start_time_2}
                onChange={(val) => setShiftForm({ ...shiftForm, start_time_2: val })}
              />
            </div>
            <div className="col-12 col-sm-6">
              <TimePicker12
                label="End Time 2"
                value={shiftForm.end_time_2}
                onChange={(val) => setShiftForm({ ...shiftForm, end_time_2: val })}
              />
            </div>
          </div>
        )}

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
      </Modal>

      {/* INSURANCE MODAL */}
      <Modal
        open={insuranceModalOpen}
        onClose={() => setInsuranceModalOpen(false)}
        title={editInsurance ? "Edit Insurance" : "Add Insurance"}
        footer={
          <>
            <button
              className="erp-btn erp-btn-outline"
              onClick={() => setInsuranceModalOpen(false)}
            >
              Cancel
            </button>
            <button
              className="erp-btn erp-btn-primary"
              onClick={handleInsuranceSave}
              disabled={insuranceSaving}
            >
              {insuranceSaving
                ? "Saving..."
                : editInsurance
                ? "Update"
                : "Create"}
            </button>
          </>
        }
      >
        <div className="mb-3">
          <label className="erp-label">Insurance Name *</label>
          <input
            className="erp-input"
            value={insuranceForm.name}
            onChange={(e) =>
              setInsuranceForm({ ...insuranceForm, name: e.target.value })
            }
            placeholder="e.g., Health Insurance"
          />
        </div>

        <div className="mb-3">
          <label className="erp-label">Annual Amount (?) *</label>
          <input
            type="number"
            className="erp-input"
            value={insuranceForm.annual_amount}
            onChange={(e) =>
              setInsuranceForm({
                ...insuranceForm,
                annual_amount: e.target.value,
              })
            }
            placeholder="e.g., 12000"
          />
          {insuranceForm.annual_amount > 0 && (
            <small
              style={{
                color: "#059669",
                fontSize: 11,
                display: "block",
                marginTop: 4,
              }}
            >
              Monthly deduction: ?
              {(parseFloat(insuranceForm.annual_amount) / 12).toFixed(2)}
            </small>
          )}
        </div>

        <div className="mb-3">
          <label className="erp-label">Description (Optional)</label>
          <textarea
            className="erp-input"
            rows={2}
            value={insuranceForm.description}
            onChange={(e) =>
              setInsuranceForm({
                ...insuranceForm,
                description: e.target.value,
              })
            }
            placeholder="Short description"
            style={{ resize: "vertical" }}
          />
        </div>
      </Modal>
    </Layout>
  );
};

export default ManagerSettings;