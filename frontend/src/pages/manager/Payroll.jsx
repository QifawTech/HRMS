import { useState, useEffect, useCallback, useRef } from "react";
import {
  Plus,
  Search,
  Eye,
  Trash2,
  Printer,
  CheckCircle2,
  Clock,
  Download,
  X,
  Wallet,
  TrendingUp,
  Users,
} from "lucide-react";
import Layout from "../../components/layout/Layout";
import Modal from "../../components/common/Modal";
import Toast from "../../components/common/Toast";
import PayslipPreview from "../../components/payroll/PayslipPreview";
import * as api from "../../api/payrollApi";
import * as empApi from "../../api/employeeApi";
import * as settingsApi from "../../api/settingsApi";  // NEW IMPORT
import { formatDateTime } from "../../utils/dateUtils";

const FONT = "'Calibri', 'Segoe UI', -apple-system, sans-serif";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const formatCurrency = (n) => {
  if (n == null || isNaN(n)) return "0";
  return Number(n).toLocaleString("en-IN");
};

const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const monthLabel = (m) => {
  if (!m) return "";
  const [y, mo] = m.split("-");
  return `${MONTHS[parseInt(mo) - 1]} ${y}`;
};

// ============================================
// Empty form — NOTE: pt_amount removed!
// PT is now slab-based, calculated by backend from employee's salary.
// ============================================
const emptyForm = {
  employee_id: "",
  month: currentMonth(),
  paid_days: 30,
  lop_days: 0,
  basic: "",
  hra: "",
  special_allowance: "",
  pf_applicable: false,
  esi_applicable: false,
  pt_applicable: false,
  tds_applicable: false,
  pf_percent: 12,
  esi_percent: 0.75,
  // pt_amount removed — NOT sent to backend anymore
  tds_amount: 0,
  other_deduction: 0,
};

const ManagerPayroll = () => {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({});
  const [employees, setEmployees] = useState([]);
  const [company, setCompany] = useState(null);
  const [settings, setSettings] = useState(null);  // NEW: settings state
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(currentMonth());
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [preview, setPreview] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const printRef = useRef(null);

  // ============================================
  // Load
  // ============================================
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, sRes] = await Promise.all([
        api.listPayrolls(month, "", search),
        api.getPayrollStats(month),
      ]);
      setItems(Array.isArray(pRes.data) ? pRes.data : []);
      setStats(sRes.data || {});
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [month, search]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => {
    empApi
      .listEmployees("", "", "ACTIVE")
      .then((r) => setEmployees(Array.isArray(r.data) ? r.data : []))
      .catch(() => {});
    api
      .getCompanyInfo()
      .then((r) => setCompany(r.data))
      .catch(() => {});
    // NEW: Fetch company settings (for PF/ESI fallback)
    settingsApi
      .getCompanySettings()
      .then((r) => setSettings(r.data))
      .catch(() => {});
  }, []);

  // ============================================
  // Employee select → auto-fill salary
  // ============================================
  const onSelectEmployee = (empId) => {
    const emp = employees.find((e) => e._id === empId);
    const s = emp?.salary || {};

    // PF/ESI percent: prefer employee's, but fallback to settings if 0/empty
    // (This handles old employees who were saved when settings had 0)
    const pf_pct =
      s.pf_percent && s.pf_percent > 0
        ? s.pf_percent
        : settings?.pf_percent ?? 12;
    const esi_pct =
      s.esi_percent && s.esi_percent > 0
        ? s.esi_percent
        : settings?.esi_percent ?? 0.75;

    setForm((f) => ({
      ...f,
      employee_id: empId,
      basic: s.basic || 0,
      hra: s.hra || 0,
      special_allowance: s.special_allowance || 0,
      pf_applicable: s.pf_applicable || false,
      esi_applicable: s.esi_applicable || false,
      pt_applicable: s.pt_applicable || false,
      tds_applicable: s.tds_applicable || false,
      pf_percent: pf_pct,
      esi_percent: esi_pct,
      // pt_amount NOT set — backend handles it from salary.professional_tax
      tds_amount: s.tds_amount ?? 0,
    }));
  };

  // ============================================
  // Generate
  // ============================================
  const handleSubmit = async () => {
    if (!form.employee_id) return setToast({ message: "Select employee", type: "error" });
    if (!form.month) return setToast({ message: "Select month", type: "error" });

    setSaving(true);
    try {
      // NOTE: pt_amount is NOT sent to backend anymore.
      // Backend uses employee.salary.professional_tax (slab-based).
      const payload = {
        employee_id: form.employee_id,
        month: form.month,
        paid_days: parseInt(form.paid_days) || 30,
        lop_days: parseInt(form.lop_days) || 0,
        basic: parseFloat(form.basic) || 0,
        hra: parseFloat(form.hra) || 0,
        special_allowance: parseFloat(form.special_allowance) || 0,
        pf_applicable: form.pf_applicable,
        esi_applicable: form.esi_applicable,
        pt_applicable: form.pt_applicable,
        tds_applicable: form.tds_applicable,
        pf_percent: parseFloat(form.pf_percent) || 0,
        esi_percent: parseFloat(form.esi_percent) || 0,
        tds_amount: parseFloat(form.tds_amount) || 0,
        other_deduction: parseFloat(form.other_deduction) || 0,
      };
      await api.generatePayroll(payload);
      setToast({ message: "Payslip generated!", type: "success" });
      setModalOpen(false);
      load();
    } catch (err) {
      setToast({
        message: err.response?.data?.error || "Failed",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleMarkPaid = async (id) => {
    try {
      await api.markPaid(id);
      setToast({ message: "Marked as paid", type: "success" });
      load();
    } catch (err) {
      setToast({ message: "Failed", type: "error" });
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await api.deletePayroll(confirmDelete._id);
      setToast({ message: "Deleted", type: "success" });
      setConfirmDelete(null);
      load();
    } catch (err) {
      setToast({ message: "Failed", type: "error" });
    }
  };

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const w = window.open("", "_blank");
    w.document.write(`
      <html><head><title>Payslip</title>
      <style>
        @page { size: A4; margin: 12mm; }
        body { margin: 0; padding: 0; font-family: 'Calibri', 'Segoe UI', sans-serif; }
      </style>
      </head><body>${content.innerHTML}</body></html>
    `);
    w.document.close();
    setTimeout(() => {
      w.focus();
      w.print();
      w.close();
    }, 400);
  };

  const openPreview = (p) => setPreview(p);

  const monthOptions = () => {
    const arr = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      arr.push({
        value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}`,
      });
    }
    return arr;
  };

  return (
    <Layout>
      <div style={{ fontFamily: FONT, maxWidth: 1200, margin: "0 auto" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 24,
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <h1
              style={{
                fontSize: 24,
                fontWeight: 700,
                color: "#0f172a",
                letterSpacing: "-0.5px",
                marginBottom: 4,
              }}
            >
              Payroll
            </h1>
            <p style={{ fontSize: 13.5, color: "#64748b", margin: 0 }}>
              Generate and manage employee payslips
            </p>
          </div>
          <button
            onClick={() => {
              setForm({ ...emptyForm, month: currentMonth() });
              setModalOpen(true);
            }}
            style={{
              background: "linear-gradient(135deg, #6366f1, #4f46e5)",
              color: "white",
              border: "none",
              borderRadius: 10,
              padding: "10px 18px",
              fontSize: 13.5,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontFamily: FONT,
              boxShadow: "0 4px 12px -4px rgba(79,70,229,0.4)",
            }}
          >
            <Plus size={15} strokeWidth={2.5} /> Generate Payslip
          </button>
        </div>

        {/* Stats */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 12,
            marginBottom: 24,
          }}
        >
          <Tile
            label="Total Payrolls"
            value={stats.total || 0}
            color="#4f46e5"
            bg="#eef2ff"
            Icon={Wallet}
          />
          <Tile
            label="Total Amount"
            value={`₹ ${formatCurrency(stats.total_amount || 0)}`}
            color="#0891b2"
            bg="#ecfeff"
            Icon={TrendingUp}
          />
          <Tile
            label="Generated"
            value={stats.generated || 0}
            color="#d97706"
            bg="#fffbeb"
            Icon={Clock}
          />
          <Tile
            label="Paid"
            value={stats.paid || 0}
            color="#059669"
            bg="#ecfdf5"
            Icon={CheckCircle2}
          />
        </div>

        {/* Filters */}
        <div
          style={{
            background: "white",
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            padding: 12,
            marginBottom: 20,
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            style={{
              padding: "9px 12px",
              border: "1px solid #e2e8f0",
              borderRadius: 10,
              fontSize: 13,
              fontFamily: FONT,
              background: "white",
              cursor: "pointer",
              minWidth: 200,
              outline: "none",
            }}
          >
            {monthOptions().map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          <div
            style={{
              position: "relative",
              flex: "1 1 260px",
              maxWidth: 320,
            }}
          >
            <Search
              size={15}
              color="#94a3b8"
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
              }}
            />
            <input
              type="text"
              placeholder="Search employee..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                padding: "9px 12px 9px 34px",
                border: "1px solid #e2e8f0",
                borderRadius: 10,
                fontSize: 13,
                fontFamily: FONT,
                outline: "none",
              }}
            />
          </div>
        </div>

        {/* List */}
        {loading ? (
          <LoadingCard />
        ) : items.length === 0 ? (
          <EmptyState
            onAdd={() => {
              setForm({ ...emptyForm, month: currentMonth() });
              setModalOpen(true);
            }}
          />
        ) : (
          <div
            style={{
              background: "white",
              border: "1px solid #e2e8f0",
              borderRadius: 14,
              overflow: "hidden",
            }}
          >
            <table className="erp-table" style={{ fontFamily: FONT }}>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Period</th>
                  <th>Paid Days</th>
                  <th style={{ textAlign: "right" }}>Gross</th>
                  <th style={{ textAlign: "right" }}>Deductions</th>
                  <th style={{ textAlign: "right" }}>Net Salary</th>
                  <th>Status</th>
                  <th style={{ width: 160 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p._id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{p.employee_name}</div>
                      <div style={{ fontSize: 11, color: "#94a3b8" }}>
                        {p.employee_code}
                      </div>
                    </td>
                    <td style={{ fontSize: 12.5 }}>{p.pay_period}</td>
                    <td>{p.paid_days}</td>
                    <td style={{ textAlign: "right", fontWeight: 600 }}>
                      ₹ {formatCurrency(p.gross_earnings)}
                    </td>
                    <td style={{ textAlign: "right", color: "#dc2626" }}>
                      ₹ {formatCurrency(p.total_deductions)}
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 700, color: "#1e40af" }}>
                      ₹ {formatCurrency(p.net_salary)}
                    </td>
                    <td>
                      <span
                        className={
                          p.status === "Paid"
                            ? "erp-badge erp-badge-green"
                            : "erp-badge erp-badge-yellow"
                        }
                      >
                        {p.status === "Paid" ? "● Paid" : "● Generated"}
                      </span>
                    </td>
                    <td>
                      <div className="d-flex gap-1">
                        <button
                          className="erp-icon-btn"
                          onClick={() => openPreview(p)}
                          title="View Payslip"
                          style={{ padding: 6, color: "#4f46e5" }}
                        >
                          <Eye size={13} />
                        </button>
                        {p.status !== "Paid" && (
                          <button
                            className="erp-icon-btn"
                            onClick={() => handleMarkPaid(p._id)}
                            title="Mark Paid"
                            style={{ padding: 6, color: "#059669" }}
                          >
                            <CheckCircle2 size={13} />
                          </button>
                        )}
                        <button
                          className="erp-icon-btn erp-icon-btn-danger"
                          onClick={() => setConfirmDelete(p)}
                          title="Delete"
                          style={{ padding: 6 }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ============================================
          Generate Modal
          ============================================ */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Generate Payslip"
        footer={
          <>
            <button
              className="erp-btn erp-btn-outline"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </button>
            <button
              className="erp-btn erp-btn-primary"
              onClick={handleSubmit}
              disabled={saving}
            >
              {saving ? "Generating..." : "Generate Payslip"}
            </button>
          </>
        }
      >
        <div className="row g-3">
          <div className="col-12">
            <label className="erp-label">Employee *</label>
            <select
              className="erp-input"
              value={form.employee_id}
              onChange={(e) => onSelectEmployee(e.target.value)}
            >
              <option value="">Select Employee</option>
              {employees.map((emp) => (
                <option key={emp._id} value={emp._id}>
                  {emp.first_name} {emp.last_name} ({emp.employee_code})
                </option>
              ))}
            </select>
          </div>

          <div className="col-6">
            <label className="erp-label">Month *</label>
            <select
              className="erp-input"
              value={form.month}
              onChange={(e) => setForm({ ...form, month: e.target.value })}
            >
              {monthOptions().map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className="col-3">
            <label className="erp-label">Paid Days</label>
            <input
              type="number"
              className="erp-input"
              value={form.paid_days}
              onChange={(e) => setForm({ ...form, paid_days: e.target.value })}
            />
          </div>

          <div className="col-3">
            <label className="erp-label">LOP Days</label>
            <input
              type="number"
              className="erp-input"
              value={form.lop_days}
              onChange={(e) => setForm({ ...form, lop_days: e.target.value })}
            />
          </div>

          <div className="col-4">
            <label className="erp-label">Basic Salary (₹)</label>
            <input
              type="number"
              className="erp-input"
              value={form.basic}
              onChange={(e) => setForm({ ...form, basic: e.target.value })}
            />
          </div>

          <div className="col-4">
            <label className="erp-label">HRA (₹)</label>
            <input
              type="number"
              className="erp-input"
              value={form.hra}
              onChange={(e) => setForm({ ...form, hra: e.target.value })}
            />
          </div>

          <div className="col-4">
            <label className="erp-label">Special Allowance (₹)</label>
            <input
              type="number"
              className="erp-input"
              value={form.special_allowance}
              onChange={(e) => setForm({ ...form, special_allowance: e.target.value })}
            />
          </div>

          <div className="col-12">
            <div
              style={{
                padding: 12,
                background: "#f8fafc",
                borderRadius: 8,
                border: "1px solid #e2e8f0",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#64748b",
                  textTransform: "uppercase",
                  letterSpacing: 0.4,
                  marginBottom: 10,
                }}
              >
                Deductions Applicable
              </div>
              <div className="row g-2">
                <div className="col-6 col-md-3">
                  <label style={checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={form.pf_applicable}
                      onChange={(e) => setForm({ ...form, pf_applicable: e.target.checked })}
                    />
                    PF ({form.pf_percent}%)
                  </label>
                </div>
                <div className="col-6 col-md-3">
                  <label style={checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={form.esi_applicable}
                      onChange={(e) => setForm({ ...form, esi_applicable: e.target.checked })}
                    />
                    ESI ({form.esi_percent}%)
                  </label>
                </div>
                <div className="col-6 col-md-3">
                  <label style={checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={form.pt_applicable}
                      onChange={(e) => setForm({ ...form, pt_applicable: e.target.checked })}
                    />
                    PT (6-month slab)
                  </label>
                </div>
                <div className="col-6 col-md-3">
                  <label style={checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={form.tds_applicable}
                      onChange={(e) => setForm({ ...form, tds_applicable: e.target.checked })}
                    />
                    TDS
                  </label>
                </div>
              </div>

              {/* Info about PT */}
              <div
                style={{
                  marginTop: 10,
                  padding: 8,
                  background: "#fef3c7",
                  borderRadius: 6,
                  border: "1px solid #fde68a",
                  fontSize: 11.5,
                  color: "#92400e",
                  lineHeight: 1.5,
                }}
              >
                <strong>Note:</strong> Professional Tax is auto-calculated from
                the employee's salary (6-month slab). It's deducted only in{" "}
                <strong>April</strong> and <strong>October</strong>.
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* ============================================
          Preview Modal (Full Payslip)
          ============================================ */}
      {preview && company && (
        <Modal
          open={true}
          onClose={() => setPreview(null)}
          title="Payslip Preview"
          footer={
            <>
              <button
                className="erp-btn erp-btn-outline"
                onClick={() => setPreview(null)}
              >
                Close
              </button>
              <button
                className="erp-btn erp-btn-primary"
                onClick={handlePrint}
              >
                <Printer size={14} /> Print / Save PDF
              </button>
            </>
          }
        >
          <div
            style={{
              background: "#f8fafc",
              padding: 16,
              borderRadius: 10,
              maxHeight: "70vh",
              overflowY: "auto",
            }}
          >
            <div style={{ background: "white", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
              <PayslipPreview
                payslip={preview}
                company={company}
                innerRef={printRef}
              />
            </div>
          </div>
        </Modal>
      )}

      {/* Confirm Delete */}
      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete Payslip?"
        footer={
          <>
            <button
              className="erp-btn erp-btn-outline"
              onClick={() => setConfirmDelete(null)}
            >
              Cancel
            </button>
            <button className="erp-btn erp-btn-danger" onClick={handleDelete}>
              Yes, Delete
            </button>
          </>
        }
      >
        <p style={{ margin: 0, color: "#6b7280" }}>
          Delete payslip for <strong>{confirmDelete?.employee_name}</strong> ({confirmDelete?.pay_period})?
        </p>
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

const checkboxLabel = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: 13,
  fontFamily: FONT,
  color: "#334155",
  cursor: "pointer",
};

const Tile = ({ label, value, color, bg, Icon }) => (
  <div
    style={{
      background: "white",
      border: "1px solid #e2e8f0",
      borderRadius: 12,
      padding: "14px 16px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      fontFamily: FONT,
    }}
  >
    <div>
      <div
        style={{
          fontSize: 10.5,
          fontWeight: 700,
          color: "#94a3b8",
          textTransform: "uppercase",
          letterSpacing: 0.6,
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 20,
          fontWeight: 800,
          color: "#0f172a",
          lineHeight: 1,
          letterSpacing: "-0.5px",
        }}
      >
        {value}
      </div>
    </div>
    <div
      style={{
        width: 38,
        height: 38,
        borderRadius: 10,
        background: bg,
        color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Icon size={17} strokeWidth={2.4} />
    </div>
  </div>
);

const LoadingCard = () => (
  <div
    style={{
      background: "white",
      borderRadius: 14,
      border: "1px solid #e2e8f0",
      padding: 60,
      textAlign: "center",
      color: "#94a3b8",
      fontFamily: FONT,
      fontSize: 13,
    }}
  >
    <div className="spinner-border spinner-border-sm me-2" />
    Loading payrolls...
  </div>
);

const EmptyState = ({ onAdd }) => (
  <div
    style={{
      background: "white",
      borderRadius: 14,
      border: "1px solid #e2e8f0",
      padding: "60px 20px",
      textAlign: "center",
      fontFamily: FONT,
    }}
  >
    <div
      style={{
        width: 64,
        height: 64,
        borderRadius: "50%",
        background: "linear-gradient(135deg, #eef2ff, #f1f5f9)",
        color: "#6366f1",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 16,
      }}
    >
      <Wallet size={28} strokeWidth={2} />
    </div>
    <h3
      style={{
        fontSize: 16,
        fontWeight: 700,
        color: "#0f172a",
        margin: 0,
        marginBottom: 6,
      }}
    >
      No payslips yet
    </h3>
    <p style={{ fontSize: 13, color: "#64748b", margin: 0, marginBottom: 20 }}>
      Generate your first payslip for this month
    </p>
    <button
      onClick={onAdd}
      style={{
        background: "linear-gradient(135deg, #6366f1, #4f46e5)",
        color: "white",
        border: "none",
        borderRadius: 10,
        padding: "10px 20px",
        fontSize: 13.5,
        fontWeight: 600,
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontFamily: FONT,
      }}
    >
      <Plus size={15} strokeWidth={2.5} /> Generate Payslip
    </button>
  </div>
);

export default ManagerPayroll;