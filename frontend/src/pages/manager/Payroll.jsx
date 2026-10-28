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
  AlertTriangle,
} from "lucide-react";
import Layout from "../../components/layout/Layout";
import Modal from "../../components/common/Modal";
import Toast from "../../components/common/Toast";
import PayslipPreview from "../../components/payroll/PayslipPreview";
import * as api from "../../api/payrollApi";
import * as empApi from "../../api/employeeApi";
import * as settingsApi from "../../api/settingsApi";
import { formatDateTime } from "../../utils/dateUtils";

const FONT = "'Inter', 'Segoe UI', -apple-system, sans-serif";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
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
  tds_amount: 0,
  other_deduction: 0,
};

const ManagerPayroll = () => {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({});
  const [employees, setEmployees] = useState([]);
  const [company, setCompany] = useState(null);
  const [settings, setSettings] = useState(null);
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

  const [ptMonths, setPtMonths] = useState([4, 10]);

  // ✅ BULK STATES
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);
  const [bulkOverwrite, setBulkOverwrite] = useState(false);

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
    settingsApi
      .getCompanySettings()
      .then((r) => {
        setSettings(r.data);
        setPtMonths(r.data?.pt_deduction_months || [4, 10]);
      })
      .catch(() => {});
  }, []);

  // ============================================
  // Employee select → auto-fill salary
  // ============================================
  const onSelectEmployee = (empId) => {
    const emp = employees.find((e) => e._id === empId);
    const s = emp?.salary || {};

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
      tds_amount: s.tds_amount ?? 0,
    }));
  };

  const isPTApplicableMonth = () => {
    const m = parseInt((form.month || "").split("-")[1]);
    return ptMonths.includes(m);
  };

  // ============================================
  // Generate — Single
  // ============================================
  const handleSubmit = async () => {
    if (!form.employee_id)
      return setToast({ message: "Select employee", type: "error" });
    if (!form.month)
      return setToast({ message: "Select month", type: "error" });

    setSaving(true);
    try {
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

  // ============================================
  // Generate — BULK (All Employees)
  // ============================================
  const handleBulkGenerate = async () => {
    setBulkRunning(true);
    setBulkResult(null);
    try {
      const res = await api.generateBulkPayroll(month, bulkOverwrite);
      setBulkResult(res.data);
      setToast({
        message: `✅ ${res.data.created} payslips generated!`,
        type: "success",
      });
      load();
    } catch (err) {
      setToast({
        message: err.response?.data?.error || "Bulk generation failed",
        type: "error",
      });
    } finally {
      setBulkRunning(false);
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
        body { margin: 0; padding: 0; font-family: 'Inter', 'Segoe UI', sans-serif; }
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
      <style>{`
        .pay-page * { font-family: ${FONT}; }
        /* ✅ FIX: Max-width and margin auto ah remove panni, full width ah maathiiruken */
        .pay-page { 
          font-family: ${FONT}; 
          width: 100%;
          padding: 0 20px;
        }

        .pay-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
          flex-wrap: wrap;
          gap: 12px;
        }
        .pay-header-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        .pay-title {
          font-size: 24px;
          font-weight: 700;
          color: #0f172a;
          letter-spacing: -0.5px;
          margin-bottom: 4px;
        }
        .pay-subtitle {
          font-size: 13.5px;
          color: #64748b;
          margin: 0;
        }
        .pay-generate-btn {
          background: linear-gradient(135deg, #6366f1, #4f46e5);
          color: white;
          border: none;
          border-radius: 10px;
          padding: 10px 18px;
          font-size: 13.5px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          font-family: ${FONT};
          box-shadow: 0 4px 12px -4px rgba(79,70,229,0.4);
        }
        .pay-bulk-btn {
          background: linear-gradient(135deg, #059669, #047857);
          color: white;
          border: none;
          border-radius: 10px;
          padding: 10px 18px;
          font-size: 13.5px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          font-family: ${FONT};
          box-shadow: 0 4px 12px -4px rgba(5,150,105,0.4);
        }

        .pay-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 12px;
          margin-bottom: 24px;
        }

        .pay-filters {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 12px;
          margin-bottom: 20px;
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        .pay-month-select {
          padding: 9px 12px;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          font-size: 13px;
          font-family: ${FONT};
          background: white;
          cursor: pointer;
          min-width: 200px;
          outline: none;
        }
        .pay-search-wrapper {
          position: relative;
          flex: 1 1 260px;
          max-width: 320px;
        }
        .pay-search-input {
          width: 100%;
          padding: 9px 12px 9px 34px;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          font-size: 13px;
          font-family: ${FONT};
          outline: none;
        }

        /* Mobile card view */
        .pay-mobile-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 14px;
          margin-bottom: 10px;
          font-family: ${FONT};
        }
        .pay-mobile-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 10px;
          margin-bottom: 12px;
          padding-bottom: 12px;
          border-bottom: 1px dashed #f1f5f9;
        }
        .pay-mobile-name {
          font-weight: 700;
          font-size: 14.5px;
          color: #0f172a;
        }
        .pay-mobile-code {
          font-size: 11.5px;
          color: #94a3b8;
          margin-top: 2px;
        }
        .pay-mobile-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px 12px;
          font-size: 12.5px;
        }
        .pay-field-label {
          font-size: 10px;
          color: #94a3b8;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        .pay-field-value {
          font-weight: 600;
          margin-top: 3px;
          color: #0f172a;
        }
        .pay-mobile-actions {
          display: flex;
          gap: 8px;
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px dashed #f1f5f9;
        }
        .pay-mobile-actions .erp-icon-btn {
          flex: 1;
          justify-content: center;
          padding: 9px;
          border-radius: 8px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          font-family: ${FONT};
        }

        @media (max-width: 767px) {
          .pay-page { padding: 0 4px; }
          .pay-title { font-size: 22px; }
          .pay-subtitle { font-size: 12.5px; }
          .pay-header { margin-bottom: 16px; }
          .pay-header-actions { width: 100%; }
          .pay-generate-btn,
          .pay-bulk-btn {
            flex: 1 1 calc(50% - 5px);
            justify-content: center;
            padding: 10px 12px;
            font-size: 13px;
          }
          .pay-stats { gap: 10px; margin-bottom: 16px; }
          .pay-filters { padding: 10px; gap: 8px; }
          .pay-month-select { min-width: 0; width: 100%; flex: 1 1 100%; }
          .pay-search-wrapper { flex: 1 1 100%; max-width: none; }
        }

        @media (max-width: 400px) {
          .pay-generate-btn,
          .pay-bulk-btn {
            flex: 1 1 100%;
          }
        }
      `}</style>

      <div className="pay-page">
        {/* Header */}
        <div className="pay-header">
          <div>
            <h1 className="pay-title">Payroll</h1>
            <p className="pay-subtitle">
              Generate and manage employee payslips
            </p>
          </div>
          <div className="pay-header-actions">
            <button
              onClick={() => {
                setForm({ ...emptyForm, month: currentMonth() });
                setModalOpen(true);
              }}
              className="pay-generate-btn"
            >
              <Plus size={15} strokeWidth={2.5} /> Generate Payslip
            </button>
            <button
              onClick={() => {
                setBulkModalOpen(true);
                setBulkResult(null);
                setBulkOverwrite(false);
              }}
              className="pay-bulk-btn"
            >
              <Users size={15} strokeWidth={2.5} /> Generate All
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="pay-stats">
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
        <div className="pay-filters">
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="pay-month-select"
          >
            {monthOptions().map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          <div className="pay-search-wrapper">
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
              className="pay-search-input"
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
            onBulk={() => {
              setBulkModalOpen(true);
              setBulkResult(null);
              setBulkOverwrite(false);
            }}
          />
        ) : (
          <>
            {/* Desktop Table */}
            <div
              className="d-none d-lg-block"
              style={{
                background: "white",
                border: "1px solid #e2e8f0",
                borderRadius: 14,
                overflow: "hidden",
              }}
            >
              <div className="table-responsive">
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
                          <div style={{ fontWeight: 600 }}>
                            {p.employee_name}
                          </div>
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
                        <td
                          style={{
                            textAlign: "right",
                            fontWeight: 700,
                            color: "#1e40af",
                          }}
                        >
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
            </div>

            {/* Mobile Cards */}
            <div className="d-lg-none">
              {items.map((p) => (
                <div key={p._id} className="pay-mobile-card">
                  <div className="pay-mobile-head">
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="pay-mobile-name">{p.employee_name}</div>
                      <div className="pay-mobile-code">
                        {p.employee_code} · {p.pay_period}
                      </div>
                    </div>
                    <span
                      className={
                        p.status === "Paid"
                          ? "erp-badge erp-badge-green"
                          : "erp-badge erp-badge-yellow"
                      }
                      style={{ flexShrink: 0 }}
                    >
                      {p.status === "Paid" ? "● Paid" : "● Generated"}
                    </span>
                  </div>

                  <div className="pay-mobile-grid">
                    <div>
                      <div className="pay-field-label">Paid Days</div>
                      <div className="pay-field-value">{p.paid_days}</div>
                    </div>
                    <div>
                      <div className="pay-field-label">Gross</div>
                      <div className="pay-field-value">
                        ₹ {formatCurrency(p.gross_earnings)}
                      </div>
                    </div>
                    <div>
                      <div className="pay-field-label">Deductions</div>
                      <div
                        className="pay-field-value"
                        style={{ color: "#dc2626" }}
                      >
                        ₹ {formatCurrency(p.total_deductions)}
                      </div>
                    </div>
                    <div>
                      <div className="pay-field-label">Net Salary</div>
                      <div
                        className="pay-field-value"
                        style={{ color: "#1e40af", fontSize: 14 }}
                      >
                        ₹ {formatCurrency(p.net_salary)}
                      </div>
                    </div>
                  </div>

                  <div className="pay-mobile-actions">
                    <button
                      className="erp-icon-btn"
                      onClick={() => openPreview(p)}
                      style={{ color: "#4f46e5" }}
                    >
                      <Eye size={13} /> View
                    </button>
                    {p.status !== "Paid" && (
                      <button
                        className="erp-icon-btn"
                        onClick={() => handleMarkPaid(p._id)}
                        style={{ color: "#059669" }}
                      >
                        <CheckCircle2 size={13} /> Paid
                      </button>
                    )}
                    <button
                      className="erp-icon-btn"
                      onClick={() => setConfirmDelete(p)}
                      style={{ color: "#dc2626" }}
                    >
                      <Trash2 size={13} /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ============================================
          Generate Modal (Single)
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
              {saving ? "Generating..." : "Generate Payslip"}
            </button>
          </>
        }
      >
        <div className="row g-3" style={{ fontFamily: FONT }}>
          <div className="col-12">
            <label className="erp-label">Employee *</label>
            <select
              className="erp-input"
              value={form.employee_id}
              onChange={(e) => onSelectEmployee(e.target.value)}
              style={{ fontFamily: FONT }}
            >
              <option value="">Select Employee</option>
              {employees.map((emp) => (
                <option key={emp._id} value={emp._id}>
                  {emp.first_name} {emp.last_name} ({emp.employee_code})
                </option>
              ))}
            </select>
          </div>

          <div className="col-12 col-sm-6">
            <label className="erp-label">Month *</label>
            <select
              className="erp-input"
              value={form.month}
              onChange={(e) => setForm({ ...form, month: e.target.value })}
              style={{ fontFamily: FONT }}
            >
              {monthOptions().map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className="col-6 col-sm-3">
            <label className="erp-label">Paid Days</label>
            <input
              type="number"
              className="erp-input"
              value={form.paid_days}
              onChange={(e) => setForm({ ...form, paid_days: e.target.value })}
              style={{ fontFamily: FONT }}
            />
          </div>

          <div className="col-6 col-sm-3">
            <label className="erp-label">LOP Days</label>
            <input
              type="number"
              className="erp-input"
              value={form.lop_days}
              onChange={(e) => setForm({ ...form, lop_days: e.target.value })}
              style={{ fontFamily: FONT }}
            />
          </div>

          <div className="col-12 col-sm-4">
            <label className="erp-label">Basic Salary (₹)</label>
            <input
              type="number"
              className="erp-input"
              value={form.basic}
              onChange={(e) => setForm({ ...form, basic: e.target.value })}
              style={{ fontFamily: FONT }}
            />
          </div>

          <div className="col-12 col-sm-4">
            <label className="erp-label">HRA (₹)</label>
            <input
              type="number"
              className="erp-input"
              value={form.hra}
              onChange={(e) => setForm({ ...form, hra: e.target.value })}
              style={{ fontFamily: FONT }}
            />
          </div>

          <div className="col-12 col-sm-4">
            <label className="erp-label">Special Allowance (₹)</label>
            <input
              type="number"
              className="erp-input"
              value={form.special_allowance}
              onChange={(e) =>
                setForm({ ...form, special_allowance: e.target.value })
              }
              style={{ fontFamily: FONT }}
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
                      onChange={(e) =>
                        setForm({ ...form, pf_applicable: e.target.checked })
                      }
                    />
                    PF ({form.pf_percent}%)
                  </label>
                </div>
                <div className="col-6 col-md-3">
                  <label style={checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={form.esi_applicable}
                      onChange={(e) =>
                        setForm({ ...form, esi_applicable: e.target.checked })
                      }
                    />
                    ESI ({form.esi_percent}%)
                  </label>
                </div>
                <div className="col-6 col-md-3">
                  <label style={checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={form.pt_applicable}
                      onChange={(e) =>
                        setForm({ ...form, pt_applicable: e.target.checked })
                      }
                    />
                    PT (6-month slab)
                  </label>
                  {form.pt_applicable && (
                    <div
                      style={{
                        fontSize: 10,
                        marginTop: 4,
                        fontWeight: 600,
                        fontFamily: FONT,
                        color: isPTApplicableMonth() ? "#059669" : "#dc2626",
                      }}
                    >
                      {isPTApplicableMonth()
                        ? "✓ PT will be deducted"
                        : "⚠ Not applicable this month"}
                    </div>
                  )}
                </div>
                <div className="col-6 col-md-3">
                  <label style={checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={form.tds_applicable}
                      onChange={(e) =>
                        setForm({ ...form, tds_applicable: e.target.checked })
                      }
                    />
                    TDS
                  </label>
                </div>
              </div>

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
                  fontFamily: FONT,
                }}
              >
                <strong>Note:</strong> Professional Tax is auto-calculated from
                the employee's salary (6-month slab). It's deducted only in{" "}
                <strong>
                  {ptMonths.map((m) => MONTH_SHORT[m - 1]).join(", ")}
                </strong>
                .
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* ============================================
          Bulk Generate Modal
          ============================================ */}
      <Modal
        open={bulkModalOpen}
        onClose={() => {
          setBulkModalOpen(false);
          setBulkResult(null);
        }}
        title="Generate Payslips for All Employees"
        footer={
          <>
            <button
              className="erp-btn erp-btn-outline"
              onClick={() => {
                setBulkModalOpen(false);
                setBulkResult(null);
              }}
              style={{ fontFamily: FONT }}
              disabled={bulkRunning}
            >
              {bulkResult ? "Close" : "Cancel"}
            </button>
            {!bulkResult && (
              <button
                className="erp-btn"
                onClick={handleBulkGenerate}
                disabled={bulkRunning}
                style={{
                  fontFamily: FONT,
                  background: "linear-gradient(135deg, #059669, #047857)",
                  color: "white",
                  border: "none",
                }}
              >
                {bulkRunning ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm me-2"
                      style={{ width: 12, height: 12 }}
                    />
                    Generating...
                  </>
                ) : (
                  <>
                    <Users size={14} /> Generate All
                  </>
                )}
              </button>
            )}
          </>
        }
      >
        {!bulkResult ? (
          <div style={{ fontFamily: FONT }}>
            {/* Info Box */}
            <div
              style={{
                padding: 14,
                background: "#ecfdf5",
                border: "1px solid #86efac",
                borderRadius: 10,
                marginBottom: 16,
                fontSize: 13,
                color: "#166534",
                lineHeight: 1.55,
              }}
            >
              <strong>⚠️ Warning:</strong> Existing payslips will be deleted and
  new payslips will be generated. All changes must be reviewed and
  approved by the manager before they are applied.
            </div>

            {/* Month */}
            <div className="mb-3">
              <label className="erp-label">Month</label>
              <div
                style={{
                  padding: "10px 14px",
                  background: "#f1f5f9",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#0f172a",
                }}
              >
                {monthLabel(month)}
              </div>
              <small style={{ color: "#94a3b8", fontSize: 11 }}>
                Change month from main page dropdown
              </small>
            </div>

            {/* Overwrite Toggle */}
            <div className="mb-3">
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#334155",
                }}
              >
                <input
                  type="checkbox"
                  checked={bulkOverwrite}
                  onChange={(e) => setBulkOverwrite(e.target.checked)}
                  style={{ width: 18, height: 18, cursor: "pointer" }}
                />
                Overwrite Existing <strong>Payslips</strong>
              </label>
              <small
                style={{
                  color: "#94a3b8",
                  fontSize: 11,
                  marginLeft: 28,
                  display: "block",
                  marginTop: 4,
                }}
              >
                Existing payslips will be deleted and regenerated
              </small>
            </div>

            {bulkOverwrite && (
              <div
                style={{
                  padding: 10,
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "#991b1b",
                  display: "flex",
                  gap: 8,
                  alignItems: "flex-start",
                }}
              >
                <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <strong>Warning:</strong> Existing payslips will be deleted and new payslips will be generated. All changes must be reviewed and approved by the manager before they are applied.
                  
                </div>
              </div>
            )}
          </div>
        ) : (
          // Result View
          <div style={{ fontFamily: FONT }}>
            {/* Success Summary */}
            <div
              style={{
                padding: 16,
                background: bulkResult.created > 0 ? "#ecfdf5" : "#fef3c7",
                border: `1px solid ${
                  bulkResult.created > 0 ? "#86efac" : "#fde68a"
                }`,
                borderRadius: 10,
                marginBottom: 16,
                textAlign: "center",
              }}
            >
              <CheckCircle2
                size={32}
                color={bulkResult.created > 0 ? "#059669" : "#d97706"}
                style={{ marginBottom: 8 }}
              />
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: bulkResult.created > 0 ? "#166534" : "#92400e",
                  marginBottom: 4,
                }}
              >
                {bulkResult.message}
              </div>
              <div style={{ fontSize: 12.5, color: "#64748b" }}>
                Month: <strong>{monthLabel(bulkResult.month)}</strong>
              </div>
            </div>

            {/* Stats Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 10,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  padding: 12,
                  background: "#ecfdf5",
                  borderRadius: 10,
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: "#64748b",
                    textTransform: "uppercase",
                    marginBottom: 4,
                  }}
                >
                  Created
                </div>
                <div
                  style={{ fontSize: 22, fontWeight: 800, color: "#059669" }}
                >
                  {bulkResult.created}
                </div>
              </div>
              <div
                style={{
                  padding: 12,
                  background: "#fef3c7",
                  borderRadius: 10,
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: "#64748b",
                    textTransform: "uppercase",
                    marginBottom: 4,
                  }}
                >
                  Skipped
                </div>
                <div
                  style={{ fontSize: 22, fontWeight: 800, color: "#d97706" }}
                >
                  {bulkResult.skipped}
                </div>
              </div>
              <div
                style={{
                  padding: 12,
                  background:
                    bulkResult.errors?.length > 0 ? "#fef2f2" : "#f1f5f9",
                  borderRadius: 10,
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: "#64748b",
                    textTransform: "uppercase",
                    marginBottom: 4,
                  }}
                >
                  Errors
                </div>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 800,
                    color:
                      bulkResult.errors?.length > 0 ? "#dc2626" : "#64748b",
                  }}
                >
                  {bulkResult.errors?.length || 0}
                </div>
              </div>
            </div>

            {/* Errors List */}
            {bulkResult.errors?.length > 0 && (
              <div
                style={{
                  padding: 12,
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: 10,
                  maxHeight: 200,
                  overflowY: "auto",
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#991b1b",
                    marginBottom: 8,
                    textTransform: "uppercase",
                  }}
                >
                  ⚠️ Skipped Employees
                </div>
                {bulkResult.errors.map((e, i) => (
                  <div
                    key={i}
                    style={{
                      fontSize: 12,
                      color: "#7f1d1d",
                      padding: "6px 0",
                      borderBottom:
                        i < bulkResult.errors.length - 1
                          ? "1px dashed #fecaca"
                          : "none",
                    }}
                  >
                    <strong>{e.employee_name}</strong> ({e.employee_code}) —{" "}
                    {e.error}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Preview Modal */}
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
                style={{ fontFamily: FONT }}
              >
                Close
              </button>
              <button
                className="erp-btn erp-btn-primary"
                onClick={handlePrint}
                style={{ fontFamily: FONT }}
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
            <div
              style={{
                background: "white",
                boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
              }}
            >
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
              style={{ fontFamily: FONT }}
            >
              Cancel
            </button>
            <button
              className="erp-btn erp-btn-danger"
              onClick={handleDelete}
              style={{ fontFamily: FONT }}
            >
              Yes, Delete
            </button>
          </>
        }
      >
        <p style={{ margin: 0, color: "#6b7280", fontFamily: FONT }}>
          Delete payslip for{" "}
          <strong>{confirmDelete?.employee_name}</strong> (
          {confirmDelete?.pay_period})?
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

const EmptyState = ({ onAdd, onBulk }) => (
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
      Generate payslips for this month
    </p>
    <div
      style={{
        display: "flex",
        gap: 10,
        justifyContent: "center",
        flexWrap: "wrap",
      }}
    >
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
        <Plus size={15} strokeWidth={2.5} /> Generate One
      </button>
      <button
        onClick={onBulk}
        style={{
          background: "linear-gradient(135deg, #059669, #047857)",
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
        <Users size={15} strokeWidth={2.5} /> Generate All
      </button>
    </div>
  </div>
);

export default ManagerPayroll;