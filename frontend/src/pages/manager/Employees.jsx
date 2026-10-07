import { useState, useEffect, useCallback } from "react";
import {
  UserPlus,
  Search,
  Edit2,
  UserX,
  UserCheck,
  Mail,
  Phone,
  Building2,
  Hash,
  AlertTriangle,
  Eye,
  Clock,
  Calendar,
  Save,
} from "lucide-react";
import Layout from "../../components/layout/Layout";
import Modal from "../../components/common/Modal";
import Toast from "../../components/common/Toast";
import EmployeeDetailsModal from "../../components/employees/EmployeeDetailsModal";
import * as api from "../../api/employeeApi";
import * as deptApi from "../../api/departmentApi";
import * as settingsApi from "../../api/settingsApi";
import * as shiftApi from "../../api/shiftApi";
import * as resignApi from "../../api/resignationApi";
import { formatDateTime } from "../../utils/dateUtils";

const FONT = "'Calibri', 'Segoe UI', -apple-system, sans-serif";

const getProfilePicUrl = (url) => {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `${url}`;
};

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

const emptyForm = {
  first_name: "",
  last_name: "",
  email: "",
  password: "",
  employee_code: "",
  phone: "",
  address: "",
  department_id: "",
  shift_id: "",
  date_of_joining: new Date().toISOString().split("T")[0],
  total_salary: "",
};

const Employees = () => {
  const [items, setItems] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [payrollSettings, setPayrollSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [filterStatus, setFilterStatus] = useState("ACTIVE");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const [ptPreview, setPtPreview] = useState(null);
  const [ptLoading, setPtLoading] = useState(false);

  const [detailsTarget, setDetailsTarget] = useState(null);

  const [resignTarget, setResignTarget] = useState(null);
  const [resignForm, setResignForm] = useState({
    resignation_date: new Date().toISOString().split("T")[0],
    reason: "",
  });

  // NEW: Edit last working day modal
  const [editLastDayTarget, setEditLastDayTarget] = useState(null);
  const [editLastDay, setEditLastDay] = useState("");
  const [editLastDayReason, setEditLastDayReason] = useState("");
  const [editLastDaySaving, setEditLastDaySaving] = useState(false);

  useEffect(() => {
    deptApi
      .listDepartments()
      .then((res) => setDepartments(Array.isArray(res.data) ? res.data : []))
      .catch(() => {});
    settingsApi
      .getCompanySettings()
      .then((res) => setPayrollSettings(res.data))
      .catch(() => {});
    shiftApi
      .listShifts()
      .then((res) => setShifts(Array.isArray(res.data) ? res.data : []))
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
      const res = await api.listEmployees(search, filterDept, filterStatus);
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setToast({ message: "Failed to load employees", type: "error" });
    } finally {
      setLoading(false);
    }
  }, [search, filterDept, filterStatus]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const openAdd = async () => {
    setEditing(null);
    setForm(emptyForm);
    setPtPreview(null);
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
      shift_id: item.shift_id || "",
      date_of_joining: item.date_of_joining
        ? item.date_of_joining.split("T")[0]
        : "",
      total_salary: total || "",
    });
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

    setSaving(true);
    try {
      if (editing) {
        const { email, password, employee_code, ...updateData } = form;
        await api.updateEmployee(editing._id, updateData);
        setToast({
          message: "Employee updated successfully",
          type: "success",
        });
      } else {
        await api.createEmployee(form);
        setToast({
          message: `Employee created! Login: ${form.email} / ${form.password}`,
          type: "success",
        });
      }
      setModalOpen(false);
      setPtPreview(null);
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

  const openResignModal = (emp) => {
    setResignTarget(emp);
    setResignForm({
      resignation_date: new Date().toISOString().split("T")[0],
      reason: "",
    });
  };

  const handleResign = async () => {
    if (!resignTarget) return;
    if (!resignForm.resignation_date) {
      setToast({ message: "Resignation date required", type: "error" });
      return;
    }
    try {
      await api.deactivateEmployee(resignTarget._id, resignForm);
      setToast({ message: "Employee marked as resigned", type: "success" });
      setResignTarget(null);
      load();
    } catch (err) {
      setToast({
        message: err.response?.data?.error || "Failed to deactivate",
        type: "error",
      });
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

  // ============================================
  // NEW: Edit last working day (for resigned employees)
  // ============================================
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

  const today = new Date().toISOString().split("T")[0];

  return (
    <Layout>
      <div style={{ fontFamily: FONT }}>
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
            <div className="col-6 col-md-3">
              <select
                className="erp-input"
                value={filterDept}
                onChange={(e) => setFilterDept(e.target.value)}
                style={{ fontFamily: FONT }}
              >
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-6 col-md-5">
              <select
                className="erp-input"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{ fontFamily: FONT }}
              >
                <option value="ACTIVE">Active Employees</option>
                <option value="RESIGNED">Resigned Employees</option>
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
              {search || filterDept || filterStatus !== "ACTIVE"
                ? "No employees found"
                : "No employees yet"}
            </h5>
          </div>
        ) : (
          <div className="erp-card" style={{ padding: 0, overflow: "hidden" }}>
            <div className="table-responsive">
              <table className="erp-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Code</th>
                    <th>Department</th>
                    <th>Shift</th>
                    <th>Contact</th>
                    <th>Joined</th>
                    <th>Status</th>
                    <th style={{ width: 160 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((emp) => {
                    const isResigned = emp.status === "RESIGNED";
                    const isInactive = emp.status === "INACTIVE";

                    return (
                      <tr
                        key={emp._id}
                        style={{
                          opacity: isResigned || isInactive ? 0.75 : 1,
                        }}
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
                                  border: isResigned
                                    ? "2px solid #a78bfa"
                                    : isInactive
                                    ? "2px solid #9ca3af"
                                    : "2px solid #e0e7ff",
                                  flexShrink: 0,
                                  opacity: isResigned || isInactive ? 0.6 : 1,
                                }}
                              />
                            ) : (
                              <div
                                className="erp-avatar"
                                style={
                                  isResigned
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
                                  {emp.shift_start} – {emp.shift_end}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span
                              style={{ color: "#9ca3af", fontSize: 12 }}
                            >
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
                        <td style={{ fontSize: 12.5, color: "#6b7280" }}>
                          {formatDateTime(emp.date_of_joining).split(",")[0]}
                        </td>
                        <td>
                          {emp.status === "ACTIVE" && (
                            <span className="erp-badge erp-badge-green">
                              ● Active
                            </span>
                          )}
                          {isResigned && (
                            <div>
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
                              {emp.resignation_notice_end && (
                                <div
                                  style={{
                                    fontSize: 10.5,
                                    color: "#7c3aed",
                                    marginTop: 3,
                                    fontWeight: 600,
                                  }}
                                >
                                  LWD:{" "}
                                  {new Date(
                                    emp.resignation_notice_end
                                  ).toLocaleDateString("en-IN", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  })}
                                </div>
                              )}
                            </div>
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

                            {emp.status === "ACTIVE" && (
                              <>
                                <button
                                  className="erp-icon-btn"
                                  onClick={() => openEdit(emp)}
                                  title="Edit"
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button
                                  className="erp-icon-btn erp-icon-btn-danger"
                                  onClick={() => openResignModal(emp)}
                                  title="Mark Resigned"
                                >
                                  <UserX size={14} />
                                </button>
                              </>
                            )}

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

                            {isInactive && (
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
              {saving ? "Saving..." : editing ? "Update" : "Create Employee"}
            </button>
          </>
        }
      >
        <form onSubmit={handleSubmit}>
          <div className="row g-3">
            <div className="col-6">
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
            <div className="col-6">
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
                disabled={!!editing}
                required={!editing}
                style={{ fontFamily: FONT }}
              />
            </div>

            {!editing && (
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
            )}

            <div className="col-6">
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

            <div className="col-6">
              <label className="erp-label">Phone</label>
              <input
                className="erp-input"
                placeholder="+91 98765 43210"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                style={{ fontFamily: FONT }}
              />
            </div>

            <div className="col-12">
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

            <div className="col-12">
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
                    {s.name} ({s.start_time} - {s.end_time})
                  </option>
                ))}
              </select>
              <small style={{ color: "#9ca3af", fontSize: 11 }}>
                Late/early calculations will use this shift's timing
              </small>
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

            <div className="col-12">
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
                      Total Monthly Salary (₹) *
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
                    <small style={{ color: "#4338ca", fontSize: 11 }}>
                      Enter the full salary. Breakup auto-calculated.
                    </small>
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
                        (basic *
                          (payrollSettings.hra_percent_of_basic || 0)) /
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
                      const totalDed = pf + esi + pt + tds;
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
                              <span
                                style={{
                                  fontWeight: 800,
                                  color: "#dc2626",
                                }}
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
                              <span
                                style={{
                                  fontSize: 12,
                                  fontWeight: 700,
                                }}
                              >
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

      {/* Resign Modal */}
      <Modal
        open={!!resignTarget}
        onClose={() => setResignTarget(null)}
        title="Mark Employee as Resigned"
        footer={
          <>
            <button
              className="erp-btn erp-btn-outline"
              onClick={() => setResignTarget(null)}
              style={{ fontFamily: FONT }}
            >
              Cancel
            </button>
            <button
              className="erp-btn erp-btn-danger"
              onClick={handleResign}
              style={{ fontFamily: FONT }}
            >
              Confirm Resignation
            </button>
          </>
        }
      >
        <div
          style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#991b1b",
            padding: 12,
            borderRadius: 8,
            marginBottom: 16,
            display: "flex",
            gap: 8,
            fontFamily: FONT,
          }}
        >
          <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: 13 }}>
            <strong>Warning:</strong> Employee will be marked INACTIVE and
            cannot login.
          </div>
        </div>

        <div className="mb-3">
          <label className="erp-label">Employee</label>
          <div
            style={{
              padding: "8px 12px",
              background: "#f9fafb",
              borderRadius: 8,
              fontSize: 13.5,
              fontWeight: 600,
              fontFamily: FONT,
            }}
          >
            {resignTarget?.first_name} {resignTarget?.last_name} (
            {resignTarget?.employee_code})
          </div>
        </div>

        <div className="mb-3">
          <label className="erp-label">Resignation Date *</label>
          <input
            type="date"
            className="erp-input"
            value={resignForm.resignation_date}
            onChange={(e) =>
              setResignForm({
                ...resignForm,
                resignation_date: e.target.value,
              })
            }
            style={{ fontFamily: FONT }}
          />
        </div>

        <div className="mb-3">
          <label className="erp-label">Reason (Optional)</label>
          <textarea
            className="erp-input"
            rows={3}
            value={resignForm.reason}
            onChange={(e) =>
              setResignForm({ ...resignForm, reason: e.target.value })
            }
            style={{ resize: "vertical", fontFamily: FONT }}
          />
        </div>
      </Modal>

      {/* NEW: Edit Last Working Day Modal */}
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
              <div
                style={{ fontSize: 12, color: "#7c3aed", marginTop: 3 }}
              >
                {editLastDayTarget.employee_code}
              </div>
            </div>

            {editLastDayTarget.resignation_notice_end && (
              <div
                style={{
                  padding: 10,
                  background: "#f9fafb",
                  borderRadius: 8,
                  marginBottom: 16,
                  fontSize: 12.5,
                  color: "#6b7280",
                  fontFamily: FONT,
                }}
              >
                Current LWD:{" "}
                <strong style={{ color: "#111827" }}>
                  {new Date(
                    editLastDayTarget.resignation_notice_end
                  ).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </strong>
              </div>
            )}

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
              <small style={{ color: "#9ca3af", fontSize: 11 }}>
                Employee will be notified of this change
              </small>
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