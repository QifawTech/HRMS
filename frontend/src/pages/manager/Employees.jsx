import { useState, useEffect, useCallback } from "react";
import {
  UserPlus,
  Search,
  Edit2,
  UserCheck,
  Mail,
  Phone,
  Building2,
  Briefcase,
  Hash,
  AlertTriangle,
  Eye,
  Clock,
  Calendar,
  Save,
  Trash2,
  CheckCircle2,
  GraduationCap,
  XCircle,
} from "lucide-react";
import Layout from "../../components/layout/Layout";
import Modal from "../../components/common/Modal";
import Toast from "../../components/common/Toast";
import EmployeeDetailsModal from "../../components/employees/EmployeeDetailsModal";
import * as api from "../../api/employeeApi";
import * as deptApi from "../../api/departmentApi";
import * as desigApi from "../../api/designationApi";
import * as settingsApi from "../../api/settingsApi";
import * as shiftApi from "../../api/shiftApi";
import * as resignApi from "../../api/resignationApi";
import * as insApi from "../../api/insuranceApi";
import { formatDateTime } from "../../utils/dateUtils";

const FONT = "'Inter', 'Segoe UI', -apple-system, sans-serif";

const getProfilePicUrl = (url) => {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  const backendUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
  return `${backendUrl}${url}`;
};

// 24-hour → 12-hour (AM/PM)
const formatTime12 = (t) => {
  if (!t) return "—";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ampm}`;
};

const MiniBox = ({ label, value, highlight }) => (
  <div
    style={{
      padding: "8px 10px",
      background: "white",
      borderRadius: 8,
      border: "1px solid #e2e8f0",
      textAlign: "center",
      fontFamily: FONT,
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

const emptyForm = {
  first_name: "",
  last_name: "",
  email: "",
  password: "",
  employee_code: "",
  phone: "",
  address: "",
  department_id: "",
  designation_id: "",
  shift_id: "",
  insurance_id: "",
  date_of_joining: new Date().toISOString().split("T")[0],
  end_date: "",
  total_salary: "",
  employment_type: "PERMANENT",
  intern_end_date: "",
};

const Employees = () => {
  const [items, setItems] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [insurances, setInsurances] = useState([]);
  const [payrollSettings, setPayrollSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [filterStatus, setFilterStatus] = useState("ACTIVE");
  const [filterType, setFilterType] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  // ✅ NEW: Termination reason (when end_date set in edit mode)
  const [terminateReason, setTerminateReason] = useState("");

  const [ptPreview, setPtPreview] = useState(null);
  const [ptLoading, setPtLoading] = useState(false);

  const [detailsTarget, setDetailsTarget] = useState(null);

  // ✅ NEW: Permanent delete state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [editLastDayTarget, setEditLastDayTarget] = useState(null);
  const [editLastDay, setEditLastDay] = useState("");
  const [editLastDayReason, setEditLastDayReason] = useState("");
  const [editLastDaySaving, setEditLastDaySaving] = useState(false);

  const [confirmModal, setConfirmModal] = useState(false);
  const [confirmEmp, setConfirmEmp] = useState(null);
  const [confirmForm, setConfirmForm] = useState({
    employment_type: "PERMANENT",
    confirmation_date: new Date().toISOString().slice(0, 10),
    new_salary: "",
    new_designation_id: "",
    notes: "",
  });
  const [confirmSaving, setConfirmSaving] = useState(false);

  useEffect(() => {
    deptApi
      .listDepartments()
      .then((res) => setDepartments(Array.isArray(res.data) ? res.data : []))
      .catch(() => {});
    desigApi
      .listDesignations()
      .then((res) => setDesignations(Array.isArray(res.data) ? res.data : []))
      .catch(() => {});
    settingsApi
      .getCompanySettings()
      .then((res) => setPayrollSettings(res.data))
      .catch(() => {});
    shiftApi
      .listShifts()
      .then((res) => setShifts(Array.isArray(res.data) ? res.data : []))
      .catch(() => {});
    insApi
      .listInsurances()
      .then((res) => setInsurances(Array.isArray(res.data) ? res.data : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const salary = parseFloat(form.total_salary) || 0;
    if (salary <= 0 || !modalOpen) {
      setPtPreview(null);
      return;
    }
    const timer = setTimeout(async () => {
      setPtLoading(true);
      try {
        const res = await api.calculateProfessionalTax(salary);
        setPtPreview(res.data);
      } catch (err) {
        setPtPreview(null);
      } finally {
        setPtLoading(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [form.total_salary, modalOpen]);

  const load = useCallback(async () => {
  setLoading(true);
  try {
    const res = await api.listEmployees(
      search,
      filterDept,
      filterStatus,
      filterType,
      1,      // page
      500     // limit (show up to 500; increase if needed)
    );

    // ✅ Handle paginated response
    if (
      res.data &&
      typeof res.data === "object" &&
      Array.isArray(res.data.data)
    ) {
      setItems(res.data.data);
    } else {
      // Fallback — old format (array)
      setItems(Array.isArray(res.data) ? res.data : []);
    }
  } catch (e) {
    setToast({ message: "Failed to load employees", type: "error" });
  } finally {
    setLoading(false);
  }
}, [search, filterDept, filterStatus, filterType]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const openAdd = async () => {
    setEditing(null);
    setForm(emptyForm);
    setPtPreview(null);
    setTerminateReason("");
    setModalOpen(true);
    try {
      const res = await api.getNextCode();
      setForm((f) => ({ ...f, employee_code: res.data.employee_code }));
    } catch {}
  };

  const openEdit = (item) => {
    setEditing(item);
    const s = item.salary || {};
    const total =
      s.total ||
      (s.basic || 0) + (s.hra || 0) + (s.special_allowance || 0) ||
      "";
    setForm({
      first_name: item.first_name || "",
      last_name: item.last_name || "",
      email: item.email || "",
      password: "",
      employee_code: item.employee_code || "",
      phone: item.phone || "",
      address: item.address || "",
      department_id: item.department_id || "",
      designation_id: item.designation_id || "",
      shift_id: item.shift_id || "",
      insurance_id: item.insurance_id || "",
      date_of_joining: item.date_of_joining
        ? item.date_of_joining.split("T")[0]
        : "",
      end_date: item.end_date ? item.end_date.split("T")[0] : "",
      total_salary: total || "",
      employment_type: item.employment_type || "PERMANENT",
      intern_end_date: item.intern_end_date
        ? item.intern_end_date.split("T")[0]
        : "",
    });
    setTerminateReason("");
    if (s.professional_tax !== undefined || s.six_month_gross !== undefined) {
      setPtPreview({
        six_month_gross: s.six_month_gross,
        professional_tax: s.professional_tax,
      });
    } else {
      setPtPreview(null);
    }
    setModalOpen(true);
  };

  const selectedInsurance = insurances.find(
    (ins) => ins._id === form.insurance_id
  );
  const monthlyInsurance = selectedInsurance
    ? Number(selectedInsurance.annual_amount || 0) / 12
    : 0;

  // ✅ UPDATED: End date = termination
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!form.first_name.trim() || !form.last_name.trim()) return;

    if (!editing) {
      if (!form.email.trim() || !form.password.trim()) {
        setToast({ message: "Email and password required", type: "error" });
        return;
      }
      if (form.password.length < 6) {
        setToast({
          message: "Password must be at least 6 characters",
          type: "error",
        });
        return;
      }
    }

    if (editing) {
      if (!form.email.trim()) {
        setToast({ message: "Email is required", type: "error" });
        return;
      }
      if (
        form.password &&
        form.password.length > 0 &&
        form.password.length < 6
      ) {
        setToast({
          message: "New password must be at least 6 characters",
          type: "error",
        });
        return;
      }
    }

    // ✅ NEW: If editing and end_date is set → terminate with reason
    if (editing && form.end_date) {
      if (!terminateReason.trim() || terminateReason.length < 5) {
        setToast({
          message: "Termination reason required (min 5 characters)",
          type: "error",
        });
        return;
      }
    }

    setSaving(true);
    try {
      if (editing) {
        // ✅ Step 1: If end_date set → TERMINATE first
        if (form.end_date) {
          await api.terminateEmployee(editing._id, {
            terminate_date: form.end_date,
            reason: terminateReason.trim(),
          });
        }

        // ✅ Step 2: Update other fields (without end_date if terminating)
        const updateData = { ...form };
        delete updateData.employee_code;

        // Remove password if blank
        if (!updateData.password || !updateData.password.trim()) {
          delete updateData.password;
        }

        // ✅ If terminating, remove end_date from update (already handled)
        if (form.end_date) {
          delete updateData.end_date;
        }

        // Salary handling
        if (
          updateData.total_salary === "" ||
          updateData.total_salary === null ||
          updateData.total_salary === undefined
        ) {
          delete updateData.total_salary;
        }

        if (updateData.total_salary !== undefined) {
          const numSalary = parseFloat(updateData.total_salary);
          if (isNaN(numSalary)) {
            delete updateData.total_salary;
          } else {
            updateData.total_salary = numSalary;
          }
        }

        if (!updateData.intern_end_date) {
          delete updateData.intern_end_date;
        }

        // Only call updateEmployee if there are fields to update
        if (Object.keys(updateData).length > 0) {
          await api.updateEmployee(editing._id, updateData);
        }

        const msg = form.end_date
          ? `${editing.first_name} terminated successfully.`
          : "Employee updated successfully.";

        setToast({ message: msg, type: "success" });
      } else {
        // CREATE
        await api.createEmployee(form);
        setToast({
          message: `Employee created! Login: ${form.email} / ${form.password}`,
          type: "success",
        });
      }

      setModalOpen(false);
      setPtPreview(null);
      setTerminateReason("");
      load();
    } catch (err) {
      setToast({
        message: err.response?.data?.error || "Operation failed",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  // ✅ NEW: Permanent delete handler
  const handlePermanentDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteEmployee(deleteTarget._id);
      setToast({
        message: `${deleteTarget.first_name} ${deleteTarget.last_name} permanently deleted.`,
        type: "success",
      });
      setDeleteTarget(null);
      load();
    } catch (err) {
      setToast({
        message: err.response?.data?.error || "Failed to delete",
        type: "error",
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleReactivate = async (emp) => {
    if (!window.confirm(`Reactivate ${emp.first_name} ${emp.last_name}?`))
      return;
    try {
      await api.reactivateEmployee(emp._id);
      setToast({ message: "Employee reactivated", type: "success" });
      load();
    } catch (err) {
      setToast({
        message: err.response?.data?.error || "Failed to reactivate",
        type: "error",
      });
    }
  };

  const openEditLastDay = (emp) => {
    setEditLastDayTarget(emp);
    setEditLastDay(emp.resignation_notice_end || emp.resignation_last_day || "");
    setEditLastDayReason("");
  };

  const submitEditLastDay = async () => {
    if (!editLastDayTarget) return;
    if (!editLastDay) {
      setToast({ message: "Please select a date", type: "error" });
      return;
    }
    setEditLastDaySaving(true);
    try {
      await resignApi.editResignationNotice(
        editLastDayTarget._id,
        editLastDay,
        editLastDayReason
      );
      setToast({ message: "Last working day updated", type: "success" });
      setEditLastDayTarget(null);
      load();
    } catch (err) {
      setToast({
        message: err.response?.data?.error || "Failed to update",
        type: "error",
      });
    } finally {
      setEditLastDaySaving(false);
    }
  };

  const openConfirmModal = (emp) => {
    setConfirmEmp(emp);
    const s = emp.salary || {};
    setConfirmForm({
      employment_type: "PERMANENT",
      confirmation_date: new Date().toISOString().slice(0, 10),
      new_salary: s.total || "",
      new_designation_id: "",
      notes: "",
    });
    setConfirmModal(true);
  };

  const handleConfirm = async () => {
    if (!confirmEmp) return;
    setConfirmSaving(true);
    try {
      await api.confirmEmployee(confirmEmp._id, {
        ...confirmForm,
        new_salary: confirmForm.new_salary
          ? parseFloat(confirmForm.new_salary)
          : null,
      });
      setToast({
        message: `${confirmEmp.first_name} confirmed as PERMANENT!`,
        type: "success",
      });
      setConfirmModal(false);
      load();
    } catch (err) {
      setToast({
        message: err.response?.data?.error || "Failed to confirm",
        type: "error",
      });
    } finally {
      setConfirmSaving(false);
    }
  };

  const today = new Date().toISOString().split("T")[0];

  const getTypeBadge = (type) => {
    const t = type || "PERMANENT";
    const styles = {
      INTERN: { bg: "#fef3c7", color: "#92400e", label: "Intern" },
      PROBATION: { bg: "#dbeafe", color: "#1e40af", label: "Probation" },
      PERMANENT: { bg: "#dcfce7", color: "#166534", label: "Permanent" },
    };
    const s = styles[t] || styles.PERMANENT;
    return (
      <span
        style={{
          padding: "3px 10px",
          borderRadius: 20,
          fontSize: 11,
          fontWeight: 700,
          background: s.bg,
          color: s.color,
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        <GraduationCap size={10} />
        {s.label}
      </span>
    );
  };

  const canConfirm = (emp) =>
    ["INTERN", "PROBATION"].includes(emp.employment_type) &&
    emp.status === "ACTIVE";

  return (
    <Layout>
      <div style={{ fontFamily: FONT }}>
        {/* Header */}
        <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
          <div>
            <h1 className="erp-page-title">Employees</h1>
            <p className="erp-page-subtitle mb-0">
              Manage your organization employees
            </p>
          </div>
          <button className="erp-btn erp-btn-primary" onClick={openAdd}>
            <UserPlus size={15} /> Add Employee
          </button>
        </div>

        {/* Filters */}
        <div className="erp-card mb-3" style={{ padding: 12 }}>
          <div className="row g-2">
            <div className="col-12 col-md-4">
              <div className="erp-input-wrapper">
                <Search size={16} className="erp-input-icon" />
                <input
                  className="erp-input"
                  placeholder="Search name, email, code..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ fontFamily: FONT }}
                />
              </div>
            </div>
            <div className="col-6 col-md-2">
              <select
                className="erp-input"
                value={filterDept}
                onChange={(e) => setFilterDept(e.target.value)}
                style={{ fontFamily: FONT }}
              >
                <option value="">All Depts</option>
                {departments.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-6 col-md-2">
              <select
                className="erp-input"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                style={{ fontFamily: FONT }}
              >
                <option value="">All Types</option>
                <option value="INTERN">Intern</option>
                <option value="PROBATION">Probation</option>
                <option value="PERMANENT">Permanent</option>
              </select>
            </div>
            <div className="col-12 col-md-4">
              <select
                className="erp-input"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{ fontFamily: FONT }}
              >
                <option value="ACTIVE">Active Employees</option>
                <option value="RESIGNED">Resigned Employees</option>
                <option value="TERMINATED">Terminated Employees</option>
                <option value="INACTIVE">Inactive / Deactivated</option>
                <option value="">All Employees</option>
              </select>
            </div>
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="erp-card text-center py-5" style={{ color: "#6b7280" }}>
            <div className="spinner-border spinner-border-sm me-2" />
            Loading employees...
          </div>
        ) : items.length === 0 ? (
          <div className="erp-card text-center py-5">
            <UserPlus size={42} color="#d1d5db" style={{ marginBottom: 12 }} />
            <h5 style={{ fontWeight: 600 }}>
              {search || filterDept || filterType || filterStatus !== "ACTIVE"
                ? "No employees found"
                : "No employees yet"}
            </h5>
          </div>
        ) : (
          <>
            {/* Desktop View */}
            <div
              className="erp-card d-none d-lg-block"
              style={{ padding: 0, overflow: "hidden" }}
            >
              <div className="table-responsive">
                <table className="erp-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Code</th>
                      <th>Type</th>
                      <th>Department</th>
                      <th>Designation</th>
                      <th>Shift</th>
                      <th>Contact</th>
                      <th>Status</th>
                      <th style={{ width: 130 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((emp) => {
                      const isResigned = emp.status === "RESIGNED";
                      const isTerminated = emp.status === "TERMINATED";
                      const isInactive = emp.status === "INACTIVE";
                      const isFinal = isResigned || isTerminated || isInactive;

                      return (
                        <tr
                          key={emp._id}
                          style={{ opacity: isFinal ? 0.75 : 1 }}
                        >
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              {emp.profile_picture_url ? (
                                <div
                                  style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: "50%",
                                    backgroundImage: `url(${getProfilePicUrl(
                                      emp.profile_picture_url
                                    )})`,
                                    backgroundSize: "cover",
                                    backgroundPosition: "center",
                                    border: isTerminated
                                      ? "2px solid #dc2626"
                                      : isResigned
                                      ? "2px solid #a78bfa"
                                      : isInactive
                                      ? "2px solid #9ca3af"
                                      : "2px solid #e0e7ff",
                                    flexShrink: 0,
                                    opacity: isFinal ? 0.6 : 1,
                                  }}
                                />
                              ) : (
                                <div
                                  className="erp-avatar"
                                  style={
                                    isTerminated
                                      ? { background: "#dc2626" }
                                      : isResigned
                                      ? { background: "#a78bfa" }
                                      : isInactive
                                      ? { background: "#9ca3af" }
                                      : {}
                                  }
                                >
                                  {emp.first_name?.[0]}
                                  {emp.last_name?.[0]}
                                </div>
                              )}
                              <div>
                                <div style={{ fontWeight: 600 }}>
                                  {emp.first_name} {emp.last_name}
                                </div>
                                <div
                                  style={{
                                    fontSize: 12,
                                    color: "#6b7280",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 4,
                                  }}
                                >
                                  <Mail size={11} />
                                  {emp.email || "—"}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td>
                            <span className="erp-badge erp-badge-gray">
                              <Hash size={11} />
                              {emp.employee_code}
                            </span>
                          </td>

                          <td>{getTypeBadge(emp.employment_type)}</td>

                          <td>
                            {emp.department_name ? (
                              <span className="erp-badge erp-badge-blue">
                                <Building2 size={11} />
                                {emp.department_name}
                              </span>
                            ) : (
                              <span style={{ color: "#9ca3af" }}>—</span>
                            )}
                          </td>

                          <td>
                            {emp.designation_title ? (
                              <span
                                className="erp-badge"
                                style={{
                                  background: "#fef3c7",
                                  color: "#92400e",
                                  fontWeight: 600,
                                }}
                              >
                                <Briefcase size={11} />
                                {emp.designation_title}
                              </span>
                            ) : (
                              <span style={{ color: "#9ca3af" }}>—</span>
                            )}
                          </td>

                          <td>
                            {emp.shift_name ? (
                              <div>
                                <div
                                  style={{
                                    fontSize: 12,
                                    fontWeight: 600,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 4,
                                  }}
                                >
                                  <Clock size={11} color="#4f46e5" />
                                  {emp.shift_name}
                                </div>
                                {emp.shift_start && emp.shift_end && (
                                  <div
                                    style={{
                                      fontSize: 10.5,
                                      color: "#94a3b8",
                                    }}
                                  >
                                    {formatTime12(emp.shift_start)} –{" "}
                                    {formatTime12(emp.shift_end)}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span style={{ color: "#9ca3af", fontSize: 12 }}>
                                Default
                              </span>
                            )}
                          </td>

                          <td>
                            {emp.phone ? (
                              <span
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 4,
                                  fontSize: 12.5,
                                  color: "#6b7280",
                                }}
                              >
                                <Phone size={12} />
                                {emp.phone}
                              </span>
                            ) : (
                              <span style={{ color: "#9ca3af" }}>—</span>
                            )}
                          </td>

                          <td>
                            {emp.status === "ACTIVE" && (
                              <span className="erp-badge erp-badge-green">
                                ● Active
                              </span>
                            )}
                            {isResigned && (
                              <span
                                className="erp-badge"
                                style={{
                                  background: "#ede9fe",
                                  color: "#6d28d9",
                                  fontWeight: 700,
                                }}
                              >
                                ● Resigned
                              </span>
                            )}
                            {isTerminated && (
                              <span
                                className="erp-badge"
                                style={{
                                  background: "#fee2e2",
                                  color: "#991b1b",
                                  fontWeight: 700,
                                }}
                              >
                                ● Terminated
                              </span>
                            )}
                            {isInactive && (
                              <span className="erp-badge erp-badge-gray">
                                ○ Inactive
                              </span>
                            )}
                          </td>

                          <td>
                            <div className="d-flex gap-1">
                              <button
                                className="erp-icon-btn"
                                onClick={() => setDetailsTarget(emp)}
                                title="View Details"
                                style={{ color: "#4f46e5" }}
                              >
                                <Eye size={14} />
                              </button>

                              {canConfirm(emp) && (
                                <button
                                  className="erp-icon-btn"
                                  onClick={() => openConfirmModal(emp)}
                                  title="Confirm as Permanent"
                                  style={{
                                    color: "#166534",
                                    background: "#dcfce7",
                                  }}
                                >
                                  <CheckCircle2 size={14} />
                                </button>
                              )}

                              {emp.status === "ACTIVE" && (
                                <button
                                  className="erp-icon-btn"
                                  onClick={() => openEdit(emp)}
                                  title="Edit"
                                >
                                  <Edit2 size={14} />
                                </button>
                              )}

                              {/* Permanent Delete Button */}
                              <button
                                className="erp-icon-btn"
                                onClick={() => setDeleteTarget(emp)}
                                title="Permanently Delete (Data lost)"
                                style={{
                                  color: "#991b1b",
                                  background: "#fecaca",
                                }}
                              >
                                <XCircle size={14} />
                              </button>

                              {isResigned && (
                                <button
                                  className="erp-icon-btn"
                                  onClick={() => openEditLastDay(emp)}
                                  title="Edit Last Working Day"
                                  style={{
                                    color: "#7c3aed",
                                    background: "#ede9fe",
                                  }}
                                >
                                  <Calendar size={14} />
                                </button>
                              )}

                              {(isInactive || isTerminated) && (
                                <button
                                  className="erp-icon-btn"
                                  onClick={() => handleReactivate(emp)}
                                  title="Reactivate"
                                  style={{ color: "#059669" }}
                                >
                                  <UserCheck size={14} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile View */}
            <div className="d-lg-none">
              {items.map((emp) => {
                const isResigned = emp.status === "RESIGNED";
                const isTerminated = emp.status === "TERMINATED";
                const isInactive = emp.status === "INACTIVE";
                const isFinal = isResigned || isTerminated || isInactive;

                return (
                  <div
                    key={emp._id}
                    className="erp-card mb-2"
                    style={{
                      padding: 14,
                      opacity: isFinal ? 0.8 : 1,
                      fontFamily: FONT,
                    }}
                  >
                    <div className="d-flex align-items-start gap-3 mb-3">
                      {emp.profile_picture_url ? (
                        <div
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: "50%",
                            backgroundImage: `url(${getProfilePicUrl(
                              emp.profile_picture_url
                            )})`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                            border: isTerminated
                              ? "2px solid #dc2626"
                              : isResigned
                              ? "2px solid #a78bfa"
                              : isInactive
                              ? "2px solid #9ca3af"
                              : "2px solid #e0e7ff",
                            flexShrink: 0,
                          }}
                        />
                      ) : (
                        <div
                          className="erp-avatar"
                          style={{
                            width: 48,
                            height: 48,
                            fontSize: 16,
                            ...(isTerminated
                              ? { background: "#dc2626" }
                              : isResigned
                              ? { background: "#a78bfa" }
                              : isInactive
                              ? { background: "#9ca3af" }
                              : {}),
                          }}
                        >
                          {emp.first_name?.[0]}
                          {emp.last_name?.[0]}
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: 15,
                            marginBottom: 2,
                          }}
                        >
                          {emp.first_name} {emp.last_name}
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: "#6b7280",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          <Mail size={11} style={{ flexShrink: 0 }} />
                          <span
                            style={{
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {emp.email || "—"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="d-flex gap-2 align-items-center mb-3 flex-wrap">
                      {emp.status === "ACTIVE" && (
                        <span className="erp-badge erp-badge-green">
                          ● Active
                        </span>
                      )}
                      {isResigned && (
                        <span
                          className="erp-badge"
                          style={{
                            background: "#ede9fe",
                            color: "#6d28d9",
                            fontWeight: 700,
                          }}
                        >
                          ● Resigned
                        </span>
                      )}
                      {isTerminated && (
                        <span
                          className="erp-badge"
                          style={{
                            background: "#fee2e2",
                            color: "#991b1b",
                            fontWeight: 700,
                          }}
                        >
                          ● Terminated
                        </span>
                      )}
                      {isInactive && (
                        <span className="erp-badge erp-badge-gray">
                          ○ Inactive
                        </span>
                      )}
                      {getTypeBadge(emp.employment_type)}
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "8px 12px",
                        marginBottom: 12,
                        fontSize: 12.5,
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: 10,
                            color: "#94a3b8",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: 0.3,
                          }}
                        >
                          Code
                        </div>
                        <div style={{ fontWeight: 600, marginTop: 2 }}>
                          {emp.employee_code}
                        </div>
                      </div>
                      <div>
                        <div
                          style={{
                            fontSize: 10,
                            color: "#94a3b8",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: 0.3,
                          }}
                        >
                          Department
                        </div>
                        <div style={{ fontWeight: 600, marginTop: 2 }}>
                          {emp.department_name || "—"}
                        </div>
                      </div>
                      <div>
                        <div
                          style={{
                            fontSize: 10,
                            color: "#94a3b8",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: 0.3,
                          }}
                        >
                          Designation
                        </div>
                        <div style={{ fontWeight: 600, marginTop: 2 }}>
                          {emp.designation_title || "—"}
                        </div>
                      </div>
                      <div>
                        <div
                          style={{
                            fontSize: 10,
                            color: "#94a3b8",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: 0.3,
                          }}
                        >
                          Shift
                        </div>
                        <div style={{ fontWeight: 600, marginTop: 2 }}>
                          {emp.shift_name || "Default"}
                        </div>
                      </div>
                      <div>
                        <div
                          style={{
                            fontSize: 10,
                            color: "#94a3b8",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: 0.3,
                          }}
                        >
                          Phone
                        </div>
                        <div style={{ fontWeight: 600, marginTop: 2 }}>
                          {emp.phone || "—"}
                        </div>
                      </div>
                      <div>
                        <div
                          style={{
                            fontSize: 10,
                            color: "#94a3b8",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: 0.3,
                          }}
                        >
                          Joined
                        </div>
                        <div style={{ fontWeight: 600, marginTop: 2 }}>
                          {formatDateTime(emp.date_of_joining).split(",")[0]}
                        </div>
                      </div>
                    </div>

                    <div
                      className="d-flex gap-2"
                      style={{
                        paddingTop: 12,
                        borderTop: "1px solid #f1f5f9",
                        flexWrap: "wrap",
                      }}
                    >
                      <button
                        className="erp-btn erp-btn-outline flex-fill"
                        onClick={() => setDetailsTarget(emp)}
                        style={{
                          fontFamily: FONT,
                          fontSize: 13,
                          padding: "8px",
                          justifyContent: "center",
                        }}
                      >
                        <Eye size={14} /> View
                      </button>

                      {canConfirm(emp) && (
                        <button
                          className="erp-btn flex-fill"
                          onClick={() => openConfirmModal(emp)}
                          style={{
                            fontFamily: FONT,
                            fontSize: 13,
                            padding: "8px",
                            justifyContent: "center",
                            background: "#dcfce7",
                            color: "#166534",
                            border: "1px solid #86efac",
                          }}
                        >
                          <CheckCircle2 size={14} /> Confirm
                        </button>
                      )}

                      {emp.status === "ACTIVE" && (
                        <button
                          className="erp-btn erp-btn-outline flex-fill"
                          onClick={() => openEdit(emp)}
                          style={{
                            fontFamily: FONT,
                            fontSize: 13,
                            padding: "8px",
                            justifyContent: "center",
                          }}
                        >
                          <Edit2 size={14} /> Edit
                        </button>
                      )}

                      {/* Permanent Delete (mobile) */}
                      <button
                        className="erp-btn flex-fill"
                        onClick={() => setDeleteTarget(emp)}
                        style={{
                          fontFamily: FONT,
                          fontSize: 13,
                          padding: "8px",
                          justifyContent: "center",
                          background: "#fecaca",
                          color: "#991b1b",
                          border: "1px solid #f87171",
                        }}
                      >
                        <XCircle size={14} /> Delete
                      </button>

                      {(isInactive || isTerminated) && (
                        <button
                          className="erp-btn erp-btn-primary flex-fill"
                          onClick={() => handleReactivate(emp)}
                          style={{
                            fontFamily: FONT,
                            fontSize: 13,
                            padding: "8px",
                            justifyContent: "center",
                          }}
                        >
                          <UserCheck size={14} /> Reactivate
                        </button>
                      )}

                      {isResigned && (
                        <button
                          className="erp-btn erp-btn-outline flex-fill"
                          onClick={() => openEditLastDay(emp)}
                          style={{
                            fontFamily: FONT,
                            fontSize: 13,
                            padding: "8px",
                            justifyContent: "center",
                            color: "#7c3aed",
                            borderColor: "#c4b5fd",
                          }}
                        >
                          <Calendar size={14} /> Edit LWD
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <EmployeeDetailsModal
        open={!!detailsTarget}
        employee={detailsTarget}
        onClose={() => setDetailsTarget(null)}
      />

      {/* Add / Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit Employee" : "Add New Employee"}
        footer={
          <>
            <button
              className="erp-btn erp-btn-outline"
              onClick={() => setModalOpen(false)}
              style={{ fontFamily: FONT }}
            >
              Cancel
            </button>
            <button
              className="erp-btn erp-btn-primary"
              onClick={handleSubmit}
              disabled={saving}
              style={{ fontFamily: FONT }}
            >
              {saving
                ? "Saving..."
                : editing && form.end_date
                ? "Terminate Employee"
                : editing
                ? "Update"
                : "Create Employee"}
            </button>
          </>
        }
      >
        <form onSubmit={handleSubmit}>
          <div className="row g-3">
            <div className="col-12 col-sm-6">
              <label className="erp-label">First Name *</label>
              <input
                className="erp-input"
                placeholder="John"
                value={form.first_name}
                onChange={(e) =>
                  setForm({ ...form, first_name: e.target.value })
                }
                autoFocus
                required
                style={{ fontFamily: FONT }}
              />
            </div>
            <div className="col-12 col-sm-6">
              <label className="erp-label">Last Name *</label>
              <input
                className="erp-input"
                placeholder="Doe"
                value={form.last_name}
                onChange={(e) =>
                  setForm({ ...form, last_name: e.target.value })
                }
                required
                style={{ fontFamily: FONT }}
              />
            </div>

            <div className="col-12">
              <label className="erp-label">
                Email (Login ID) {!editing && "*"}
              </label>
              <input
                type="email"
                className="erp-input"
                placeholder="john@company.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                style={{ fontFamily: FONT }}
              />
            </div>

            {!editing ? (
              <div className="col-12">
                <label className="erp-label">Password *</label>
                <input
                  type="text"
                  className="erp-input"
                  placeholder="Min 6 characters"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  required
                  minLength={6}
                  style={{ fontFamily: FONT }}
                />
              </div>
            ) : (
              <div className="col-12">
                <label className="erp-label">
                  New Password{" "}
                  <span style={{ color: "#9ca3af", fontWeight: 400 }}>
                    (optional — leave blank to keep current)
                  </span>
                </label>
                <input
                  type="text"
                  className="erp-input"
                  placeholder="Enter new password only if you want to change"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  minLength={6}
                  style={{ fontFamily: FONT }}
                />
                <small style={{ color: "#9ca3af", fontSize: 11 }}>
                  Leave blank to keep the current password
                </small>
              </div>
            )}

            <div className="col-12 col-sm-6">
              <label className="erp-label">Employee Code *</label>
              <input
                className="erp-input"
                placeholder="EMP001"
                value={form.employee_code}
                onChange={(e) =>
                  setForm({
                    ...form,
                    employee_code: e.target.value.toUpperCase(),
                  })
                }
                required
                style={{ fontFamily: FONT }}
              />
            </div>

            <div className="col-12 col-sm-6">
              <label className="erp-label">Employment Type *</label>
              <select
                className="erp-input"
                value={form.employment_type}
                onChange={(e) =>
                  setForm({ ...form, employment_type: e.target.value })
                }
                style={{ fontFamily: FONT }}
              >
                <option value="PERMANENT">Permanent</option>
                <option value="PROBATION">Probation</option>
                <option value="INTERN">Intern</option>
              </select>
            </div>

            <div className="col-12 col-sm-6">
              <label className="erp-label">Phone</label>
              <input
                className="erp-input"
                placeholder="+91 98765 43210"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                style={{ fontFamily: FONT }}
              />
            </div>

            <div className="col-12 col-sm-6">
              <label className="erp-label">Department</label>
              <select
                className="erp-input"
                value={form.department_id}
                onChange={(e) =>
                  setForm({ ...form, department_id: e.target.value })
                }
                style={{ fontFamily: FONT }}
              >
                <option value="">Select Department</option>
                {departments.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-12 col-sm-6">
              <label className="erp-label">Designation</label>
              <select
                className="erp-input"
                value={form.designation_id}
                onChange={(e) =>
                  setForm({ ...form, designation_id: e.target.value })
                }
                style={{ fontFamily: FONT }}
              >
                <option value="">Select Designation</option>
                {designations.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.title} {d.code ? `(${d.code})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-12 col-sm-6">
              <label className="erp-label">Assign Shift</label>
              <select
                className="erp-input"
                value={form.shift_id}
                onChange={(e) =>
                  setForm({ ...form, shift_id: e.target.value })
                }
                style={{ fontFamily: FONT }}
              >
                <option value="">— Use company default —</option>
                {shifts.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name} ({formatTime12(s.start_time)} -{" "}
                    {formatTime12(s.end_time)})
                  </option>
                ))}
              </select>
            </div>

            <div className="col-12 col-sm-6">
              <label className="erp-label">Insurance</label>
              <select
                className="erp-input"
                value={form.insurance_id}
                onChange={(e) =>
                  setForm({ ...form, insurance_id: e.target.value })
                }
                style={{ fontFamily: FONT }}
              >
                <option value="">— No insurance —</option>
                {insurances.map((ins) => (
                  <option key={ins._id} value={ins._id}>
                    {ins.name} — ₹
                    {Number(ins.annual_amount || 0).toLocaleString("en-IN")}
                    /year
                  </option>
                ))}
              </select>
              {selectedInsurance && (
                <small
                  style={{
                    color: "#059669",
                    fontSize: 11,
                    display: "block",
                    marginTop: 4,
                  }}
                >
                  Monthly deduction: ₹{monthlyInsurance.toFixed(2)}
                </small>
              )}
            </div>

            <div className="col-12">
              <label className="erp-label">Address</label>
              <textarea
                className="erp-input"
                rows={2}
                placeholder="Optional"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                style={{ resize: "vertical", fontFamily: FONT }}
              />
            </div>

            <div className="col-12 col-sm-6">
              <label className="erp-label">Date of Joining</label>
              <input
                type="date"
                className="erp-input"
                value={form.date_of_joining}
                onChange={(e) =>
                  setForm({ ...form, date_of_joining: e.target.value })
                }
                style={{ fontFamily: FONT }}
              />
            </div>

            {form.employment_type === "INTERN" && (
              <div className="col-12 col-sm-6">
                <label className="erp-label">
                  Intern End Date (Expected Confirmation)
                </label>
                <input
                  type="date"
                  className="erp-input"
                  value={form.intern_end_date}
                  onChange={(e) =>
                    setForm({ ...form, intern_end_date: e.target.value })
                  }
                  min={form.date_of_joining}
                  style={{ fontFamily: FONT }}
                />
                <small style={{ color: "#9ca3af", fontSize: 11 }}>
                  Reminder date for confirming as Permanent
                </small>
              </div>
            )}

            {/* ✅ End Date — Only in EDIT mode */}
            {editing && (
              <div className="col-12 col-sm-6">
                <label className="erp-label">
                  End Date{" "}
                  <span style={{ color: "#dc2626", fontWeight: 600 }}>
                    (= Terminate Employee)
                  </span>
                </label>
                <input
                  type="date"
                  className="erp-input"
                  value={form.end_date}
                  onChange={(e) =>
                    setForm({ ...form, end_date: e.target.value })
                  }
                  min={form.date_of_joining}
                  style={{ fontFamily: FONT }}
                />
                <small style={{ color: "#9ca3af", fontSize: 11 }}>
                  Setting a date will terminate this employee
                </small>
              </div>
            )}

            {/* ✅ NEW: Termination Reason — only when end_date set */}
            {editing && form.end_date && (
              <div className="col-12">
                <div
                  style={{
                    padding: 14,
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    borderRadius: 10,
                    marginBottom: 12,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 8,
                      fontSize: 13,
                      color: "#991b1b",
                      fontFamily: FONT,
                      lineHeight: 1.5,
                    }}
                  >
                    <AlertTriangle
                      size={16}
                      style={{ flexShrink: 0, marginTop: 2 }}
                    />
                    <div>
                      <strong>Termination:</strong> Employee will be marked{" "}
                      <strong>TERMINATED</strong> on{" "}
                      <strong>
                        {new Date(form.end_date).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </strong>{" "}
                      and cannot login.
                    </div>
                  </div>
                </div>

                <label className="erp-label">
                  Reason for Termination <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <textarea
                  className="erp-input"
                  rows={3}
                  placeholder="e.g., Performance issues, Policy violation, End of project..."
                  value={terminateReason}
                  onChange={(e) => setTerminateReason(e.target.value)}
                  style={{ resize: "vertical", fontFamily: FONT }}
                  required
                />
                <small style={{ color: "#9ca3af", fontSize: 11 }}>
                  Minimum 5 characters required
                </small>
              </div>
            )}

            {/* SALARY SECTION */}
            <div className="col-12">
              <div
                style={{
                  padding: 16,
                  background: "#eef2ff",
                  borderRadius: 10,
                  border: "1px solid #c7d2fe",
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: "#4338ca",
                    textTransform: "uppercase",
                    letterSpacing: 0.6,
                    marginBottom: 12,
                  }}
                >
                  💰 Monthly Salary
                </div>

                <div className="row g-3">
                  <div className="col-12 col-md-6">
                    <label className="erp-label">
                      Total Monthly Salary (₹) {!editing && "*"}
                    </label>
                    <input
                      type="number"
                      className="erp-input"
                      placeholder="e.g., 15000"
                      value={form.total_salary}
                      onChange={(e) =>
                        setForm({ ...form, total_salary: e.target.value })
                      }
                      style={{
                        fontSize: 16,
                        fontWeight: 700,
                        fontFamily: FONT,
                      }}
                    />
                  </div>
                </div>

                {payrollSettings && form.total_salary > 0 && (
                  <div
                    style={{
                      marginTop: 14,
                      paddingTop: 14,
                      borderTop: "1px solid #c7d2fe",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10.5,
                        fontWeight: 700,
                        color: "#4338ca",
                        textTransform: "uppercase",
                        letterSpacing: 0.4,
                        marginBottom: 10,
                      }}
                    >
                      Auto-Calculated Breakup
                    </div>

                    {(() => {
                      const total = parseFloat(form.total_salary) || 0;
                      const basic =
                        (total * (payrollSettings.basic_percent || 0)) / 100;
                      const hra =
                        (basic * (payrollSettings.hra_percent_of_basic || 0)) /
                        100;
                      const special = total - basic - hra;
                      const pf =
                        (basic * (payrollSettings.pf_percent || 0)) / 100;
                      const esi =
                        (total * (payrollSettings.esi_percent || 0)) / 100;
                      const pt = ptPreview?.professional_tax ?? 0;
                      const sixMonthGross = ptPreview?.six_month_gross ?? 0;
                      const tds =
                        (total * (payrollSettings.tds_percent || 0)) / 100;
                      const insAmt = monthlyInsurance;
                      const totalDed = pf + esi + pt + tds + insAmt;
                      const net = total - totalDed;

                      return (
                        <>
                          <div className="row g-2 mb-2">
                            <div className="col-6 col-md-3">
                              <MiniBox
                                label="Basic"
                                value={`₹${basic.toFixed(0)}`}
                              />
                            </div>
                            <div className="col-6 col-md-3">
                              <MiniBox
                                label="HRA"
                                value={`₹${hra.toFixed(0)}`}
                              />
                            </div>
                            <div className="col-6 col-md-3">
                              <MiniBox
                                label="Special"
                                value={`₹${special.toFixed(0)}`}
                              />
                            </div>
                            <div className="col-6 col-md-3">
                              <MiniBox
                                label="Gross"
                                value={`₹${total.toFixed(0)}`}
                                highlight
                              />
                            </div>
                          </div>

                          <div
                            style={{
                              marginTop: 8,
                              padding: 10,
                              background: "#fef3c7",
                              borderRadius: 8,
                              border: "1px solid #fde68a",
                              fontSize: 11.5,
                              color: "#92400e",
                            }}
                          >
                            <div
                              style={{
                                fontSize: 10.5,
                                fontWeight: 700,
                                color: "#92400e",
                                textTransform: "uppercase",
                                letterSpacing: 0.4,
                                marginBottom: 4,
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                              }}
                            >
                              📋 Professional Tax (6-Month Slab)
                              {ptLoading && (
                                <span
                                  className="spinner-border spinner-border-sm"
                                  style={{ width: 10, height: 10 }}
                                />
                              )}
                            </div>
                            {ptPreview ? (
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  flexWrap: "wrap",
                                  gap: 8,
                                }}
                              >
                                <span>
                                  6-Month Gross:{" "}
                                  <strong>
                                    ₹{sixMonthGross.toLocaleString("en-IN")}
                                  </strong>
                                </span>
                                <span>
                                  PT Amount:{" "}
                                  <strong style={{ color: "#dc2626" }}>
                                    ₹{pt.toLocaleString("en-IN")}
                                  </strong>
                                </span>
                              </div>
                            ) : (
                              <div style={{ color: "#a16207" }}>
                                Calculating PT slab...
                              </div>
                            )}
                          </div>

                          <div
                            style={{
                              marginTop: 8,
                              padding: 10,
                              background: "white",
                              borderRadius: 8,
                              border: "1px solid #c7d2fe",
                            }}
                          >
                            <div
                              style={{
                                fontSize: 10.5,
                                fontWeight: 700,
                                color: "#64748b",
                                textTransform: "uppercase",
                                letterSpacing: 0.4,
                                marginBottom: 6,
                              }}
                            >
                              Monthly Deductions
                            </div>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                gap: 8,
                                fontSize: 11.5,
                                color: "#64748b",
                                flexWrap: "wrap",
                              }}
                            >
                              <span>PF: ₹{pf.toFixed(0)}</span>
                              <span>ESI: ₹{esi.toFixed(2)}</span>
                              <span>PT: ₹{pt.toFixed(0)}</span>
                              <span>TDS: ₹{tds.toFixed(0)}</span>
                              {insAmt > 0 && (
                                <span>Insurance: ₹{insAmt.toFixed(0)}</span>
                              )}
                              <span
                                style={{ fontWeight: 800, color: "#dc2626" }}
                              >
                                Total: ₹{totalDed.toFixed(2)}
                              </span>
                            </div>
                            <div
                              style={{
                                marginTop: 8,
                                paddingTop: 8,
                                borderTop: "1px dashed #c7d2fe",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                              }}
                            >
                              <span style={{ fontSize: 12, fontWeight: 700 }}>
                                Net In-Hand
                              </span>
                              <span
                                style={{
                                  fontSize: 16,
                                  fontWeight: 800,
                                  color: "#059669",
                                }}
                              >
                                ₹{net.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          </div>
        </form>
      </Modal>

      {/* CONFIRM MODAL */}
      <Modal
        open={confirmModal}
        onClose={() => setConfirmModal(false)}
        title="Confirm as Permanent"
        footer={
          <>
            <button
              className="erp-btn erp-btn-outline"
              onClick={() => setConfirmModal(false)}
              style={{ fontFamily: FONT }}
            >
              Cancel
            </button>
            <button
              className="erp-btn erp-btn-primary"
              onClick={handleConfirm}
              disabled={confirmSaving}
              style={{ fontFamily: FONT }}
            >
              <CheckCircle2 size={14} />
              {confirmSaving ? "Confirming..." : "Confirm as Permanent"}
            </button>
          </>
        }
      >
        {confirmEmp && (
          <>
            <div
              style={{
                background: "#dcfce7",
                border: "1px solid #86efac",
                color: "#166534",
                padding: 12,
                borderRadius: 8,
                marginBottom: 16,
                display: "flex",
                gap: 8,
                fontFamily: FONT,
              }}
            >
              <CheckCircle2
                size={16}
                style={{ flexShrink: 0, marginTop: 2 }}
              />
              <div style={{ fontSize: 13 }}>
                <strong>
                  {confirmEmp.first_name} {confirmEmp.last_name}
                </strong>
                <br />
                <span style={{ fontSize: 12 }}>
                  {confirmEmp.employment_type} → PERMANENT
                </span>
              </div>
            </div>

            <div className="mb-3">
              <label className="erp-label">Confirmation Date *</label>
              <input
                type="date"
                className="erp-input"
                value={confirmForm.confirmation_date}
                onChange={(e) =>
                  setConfirmForm({
                    ...confirmForm,
                    confirmation_date: e.target.value,
                  })
                }
                style={{ fontFamily: FONT }}
              />
            </div>

            <div className="mb-3">
              <label className="erp-label">
                New Monthly Salary (₹){" "}
                <span style={{ color: "#94a3b8" }}>
                  (leave to keep same)
                </span>
              </label>
              <input
                type="number"
                className="erp-input"
                value={confirmForm.new_salary}
                onChange={(e) =>
                  setConfirmForm({
                    ...confirmForm,
                    new_salary: e.target.value,
                  })
                }
                placeholder="e.g., 20000"
                style={{ fontFamily: FONT }}
              />
            </div>

            <div className="mb-3">
              <label className="erp-label">
                New Designation (Optional)
              </label>
              <select
                className="erp-input"
                value={confirmForm.new_designation_id}
                onChange={(e) =>
                  setConfirmForm({
                    ...confirmForm,
                    new_designation_id: e.target.value,
                  })
                }
                style={{ fontFamily: FONT }}
              >
                <option value="">— Keep current —</option>
                {designations.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.title} {d.code ? `(${d.code})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-3">
              <label className="erp-label">Notes (Optional)</label>
              <textarea
                className="erp-input"
                rows={2}
                value={confirmForm.notes}
                onChange={(e) =>
                  setConfirmForm({ ...confirmForm, notes: e.target.value })
                }
                placeholder="e.g., Excellent performance during internship"
                style={{ resize: "vertical", fontFamily: FONT }}
              />
            </div>
          </>
        )}
      </Modal>

      {/* PERMANENT DELETE MODAL */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Permanently Delete Employee"
        footer={
          <>
            <button
              className="erp-btn erp-btn-outline"
              onClick={() => setDeleteTarget(null)}
              style={{ fontFamily: FONT }}
            >
              Cancel
            </button>
            <button
              className="erp-btn erp-btn-danger"
              onClick={handlePermanentDelete}
              disabled={deleting}
              style={{
                fontFamily: FONT,
                background: "#991b1b",
                borderColor: "#991b1b",
              }}
            >
              <XCircle size={14} />
              {deleting ? "Deleting..." : "Permanently Delete"}
            </button>
          </>
        }
      >
        {deleteTarget && (
          <>
            <div
              style={{
                background: "#7f1d1d",
                border: "2px solid #dc2626",
                color: "white",
                padding: 14,
                borderRadius: 10,
                marginBottom: 16,
                display: "flex",
                gap: 10,
                fontFamily: FONT,
              }}
            >
              <AlertTriangle
                size={22}
                style={{ flexShrink: 0, marginTop: 2, color: "#fca5a5" }}
              />
              <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                <strong style={{ fontSize: 14 }}>
                  ⚠️ DANGER — PERMANENT DELETE
                </strong>
                <br />
                This action will <strong>permanently delete</strong> the
                employee AND <strong>all associated data</strong> (attendance,
                leaves, payroll, documents). <br />
                <strong
                  style={{ color: "#fca5a5", display: "block", marginTop: 6 }}
                >
                  This CANNOT be undone!
                </strong>
              </div>
            </div>

            <div className="mb-3">
              <label className="erp-label">Employee to be deleted</label>
              <div
                style={{
                  padding: "10px 14px",
                  background: "#fef2f2",
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 700,
                  fontFamily: FONT,
                  color: "#991b1b",
                  border: "1px solid #fecaca",
                }}
              >
                {deleteTarget.first_name} {deleteTarget.last_name} (
                {deleteTarget.employee_code})
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    marginTop: 3,
                    color: "#7f1d1d",
                  }}
                >
                  {deleteTarget.email || "—"}
                </div>
              </div>
            </div>

            <div
              style={{
                padding: 12,
                background: "#fef3c7",
                border: "1px solid #fde68a",
                borderRadius: 8,
                fontSize: 12.5,
                color: "#92400e",
                fontFamily: FONT,
                lineHeight: 1.55,
              }}
            >
              💡 <strong>Tip:</strong> If you just want to deactivate this
              employee, use <strong>"Edit → End Date"</strong> instead. Data
              will be preserved. Only use <strong>Permanent Delete</strong>{" "}
              for testing/cleanup purposes.
            </div>
          </>
        )}
      </Modal>

      {/* Edit Last Working Day Modal */}
      <Modal
        open={!!editLastDayTarget}
        onClose={() => setEditLastDayTarget(null)}
        title="Edit Last Working Day"
        footer={
          <>
            <button
              className="erp-btn erp-btn-outline"
              onClick={() => setEditLastDayTarget(null)}
              style={{ fontFamily: FONT }}
            >
              Cancel
            </button>
            <button
              className="erp-btn erp-btn-primary"
              onClick={submitEditLastDay}
              disabled={editLastDaySaving}
              style={{ fontFamily: FONT }}
            >
              <Save size={14} />
              {editLastDaySaving ? "Saving..." : "Save Changes"}
            </button>
          </>
        }
      >
        {editLastDayTarget && (
          <>
            <div
              style={{
                padding: 12,
                background: "#ede9fe",
                border: "1px solid #c4b5fd",
                borderRadius: 8,
                marginBottom: 16,
                fontFamily: FONT,
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 14,
                  color: "#5b21b6",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Calendar size={16} />
                {editLastDayTarget.first_name} {editLastDayTarget.last_name}
              </div>
              <div style={{ fontSize: 12, color: "#7c3aed", marginTop: 3 }}>
                {editLastDayTarget.employee_code}
              </div>
            </div>

            <div className="mb-3">
              <label className="erp-label">New Last Working Day *</label>
              <input
                type="date"
                className="erp-input"
                value={editLastDay}
                onChange={(e) => setEditLastDay(e.target.value)}
                min={today}
                style={{ fontFamily: FONT }}
                autoFocus
              />
            </div>

            <div className="mb-3">
              <label className="erp-label">Reason (Optional)</label>
              <textarea
                className="erp-input"
                rows={3}
                placeholder="e.g., Extended for project handover..."
                value={editLastDayReason}
                onChange={(e) => setEditLastDayReason(e.target.value)}
                style={{ resize: "vertical", fontFamily: FONT }}
              />
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
    </Layout>
  );
};

export default Employees;