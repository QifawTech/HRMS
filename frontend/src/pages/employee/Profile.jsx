import { useState, useEffect, useCallback, useRef } from "react";
import {
  Mail,
  Phone,
  Building2,
  Hash,
  Calendar,
  Briefcase,
  MapPin,
  Camera,
  Loader2,
  Edit2,
  Save,
  X,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Clock,
  PartyPopper,
} from "lucide-react";
import Layout from "../../components/layout/Layout";
import Toast from "../../components/common/Toast";
import Modal from "../../components/common/Modal";
import AttendanceCalendar from "../../components/employees/AttendanceCalendar";
import * as api from "../../api/employeeApi";
import * as attApi from "../../api/attendanceApi";
import * as holidayApi from "../../api/holidayApi";   // ✅ NEW

const FONT = "'Inter', 'Segoe UI', -apple-system, sans-serif";

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

const EmployeeProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [report, setReport] = useState({ summary: {}, records: [] });
  const [reportLoading, setReportLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);

  // ✅ NEW: holidays state
  const [holidays, setHolidays] = useState([]);
  const [upcomingHolidays, setUpcomingHolidays] = useState([]);

  const fileRef = useRef(null);
  const [uploadingPic, setUploadingPic] = useState(false);

  const [editModal, setEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ phone: "", address: "" });
  const [saving, setSaving] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      const res = await api.getMyProfile();
      setProfile(res.data);
      setEditForm({
        phone: res.data.phone || "",
        address: res.data.address || "",
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const loadReport = useCallback(async () => {
    setReportLoading(true);
    try {
      const res = await attApi.getMyMonthlyReport(year, month);
      setReport(res.data || { summary: {}, records: [] });
    } catch (e) {
      console.error(e);
    } finally {
      setReportLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  // ✅ NEW: Load holidays for current year
  useEffect(() => {
    holidayApi
      .listHolidays(year)
      .then((res) => {
        const all = Array.isArray(res.data) ? res.data : [];
        setHolidays(all);

        // Upcoming holidays (next 5 from today)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const upcoming = all
          .filter((h) => new Date(h.date) >= today)
          .sort((a, b) => new Date(a.date) - new Date(b.date))
          .slice(0, 3);
        setUpcomingHolidays(upcoming);
      })
      .catch(() => {});
  }, [year]);

  // ✅ Filter holidays for current month
  const monthHolidays = holidays.filter((h) => {
    const d = new Date(h.date);
    return d.getFullYear() === year && d.getMonth() + 1 === month;
  });

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

  const handlePictureUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setToast({ message: "Please select an image file", type: "error" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setToast({ message: "Image too large (max 5MB)", type: "error" });
      return;
    }

    setUploadingPic(true);
    try {
      const res = await api.uploadProfilePicture(file);
      setProfile((p) => ({ ...p, profile_picture_url: res.data.picture_url }));
      setToast({ message: "Profile picture updated!", type: "success" });
    } catch (err) {
      setToast({
        message: err.response?.data?.error || "Upload failed",
        type: "error",
      });
    } finally {
      setUploadingPic(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleProfileSave = async () => {
    setSaving(true);
    try {
      await api.updateMyProfile(editForm);
      setProfile((p) => ({ ...p, ...editForm }));
      setToast({ message: "Profile updated!", type: "success" });
      setEditModal(false);
    } catch (err) {
      setToast({
        message: err.response?.data?.error || "Failed",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const summary = report.summary || {};
  const records = report.records || [];
  const selectedRecord = selectedDate?.record;

  if (loading || !profile) {
    return (
      <Layout>
        <div
          className="erp-card text-center py-5"
          style={{ color: "#6b7280", fontFamily: FONT }}
        >
          <div className="spinner-border spinner-border-sm me-2" />
          Loading profile...
        </div>
      </Layout>
    );
  }

  const initials = `${profile.first_name?.[0] || ""}${profile.last_name?.[0] || ""}`;
  const fullName = `${profile.first_name} ${profile.last_name}`;

  const getImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith("http")) return url;
    return `http://localhost:5000${url}`;
  };

  const profilePicUrl = getImageUrl(profile.profile_picture_url);
  const hasPicture = !!profilePicUrl;

  return (
    <Layout>
      <style>{`
        .prof-page * { font-family: ${FONT}; }
        .prof-page { font-family: ${FONT}; }

        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        .prof-hero {
          position: relative;
          padding: 28px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 20px;
          margin-bottom: 24px;
          overflow: hidden;
          box-shadow: 0 12px 32px -12px rgba(102,126,234,0.5);
        }
        .prof-hero-circle-1 {
          position: absolute;
          top: -50px; right: -50px;
          width: 180px; height: 180px;
          border-radius: 50%;
          background: rgba(255,255,255,0.08);
        }
        .prof-hero-circle-2 {
          position: absolute;
          bottom: -60px; right: 60px;
          width: 120px; height: 120px;
          border-radius: 50%;
          background: rgba(255,255,255,0.06);
        }
        .prof-hero-inner {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          gap: 24px;
          flex-wrap: wrap;
        }
        .prof-avatar {
          width: 110px;
          height: 110px;
          border-radius: 24px;
          backdrop-filter: blur(10px);
          border: 3px solid rgba(255,255,255,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 36px;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative;
          overflow: hidden;
          background-size: cover;
          background-position: center;
        }
        .prof-name {
          font-size: 26px;
          font-weight: 800;
          color: white;
          letter-spacing: -0.5px;
          margin-bottom: 6px;
          line-height: 1.1;
        }
        .prof-email {
          font-size: 14px;
          color: rgba(255,255,255,0.85);
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 14px;
          word-break: break-all;
        }
        .prof-pill-row {
          display: flex; gap: 8px; flex-wrap: wrap;
        }

        .holiday-strip {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          background: linear-gradient(135deg, #fef3c7, #fde68a);
          border: 1px solid #fcd34d;
          border-radius: 12px;
          margin-bottom: 16px;
          font-size: 12.5px;
          color: #92400e;
        }
        .holiday-strip-label {
          font-size: 10.5px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.4px;
          color: #78350f;
        }
        .holiday-chip {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: white;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 11.5px;
          font-weight: 600;
          color: #92400e;
          border: 1px solid #fcd34d;
        }

        @media (max-width: 767px) {
          .prof-page { padding: 0 4px; }
          .prof-hero { padding: 18px; border-radius: 16px; margin-bottom: 16px; }
          .prof-hero-inner { gap: 14px; }
          .prof-avatar {
            width: 76px; height: 76px;
            font-size: 26px; border-radius: 18px;
          }
          .prof-name { font-size: 20px; }
          .prof-email { font-size: 12.5px; margin-bottom: 10px; }
          .prof-page .erp-page-title { font-size: 22px; }
          .prof-page .erp-page-subtitle { font-size: 12.5px; }
          .prof-page .erp-stat-value { font-size: 20px; }
          .prof-page .erp-stat-label { font-size: 10.5px; }
          .holiday-strip { padding: 8px 12px; font-size: 12px; }
        }
      `}</style>

      <div className="prof-page">
        <div className="mb-4">
          <h1 className="erp-page-title">My Profile</h1>
          <p className="erp-page-subtitle mb-0">
            Your personal information and attendance
          </p>
        </div>

        {/* Hero Card */}
        <div className="prof-hero">
          <div className="prof-hero-circle-1" />
          <div className="prof-hero-circle-2" />

          <div className="prof-hero-inner">
            <div style={{ position: "relative" }}>
              <div
                className="prof-avatar"
                onClick={() => !uploadingPic && fileRef.current?.click()}
                style={{
                  background: hasPicture
                    ? `url(${profilePicUrl}) center/cover`
                    : "rgba(255,255,255,0.2)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "scale(1.02)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.7)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.4)";
                }}
              >
                {!hasPicture && initials}

                {uploadingPic && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "rgba(0,0,0,0.5)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Loader2
                      size={24}
                      color="white"
                      style={{ animation: "spin 1s linear infinite" }}
                    />
                  </div>
                )}
              </div>

              <div
                onClick={() => !uploadingPic && fileRef.current?.click()}
                style={{
                  position: "absolute",
                  bottom: -6,
                  right: -6,
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  background: "white",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "#4f46e5",
                  border: "2px solid white",
                }}
                title="Change picture"
              >
                <Camera size={16} strokeWidth={2.5} />
              </div>

              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handlePictureUpload}
              />
            </div>

            <div style={{ flex: 1, minWidth: 220 }}>
              <div className="prof-name">{fullName}</div>
              <div className="prof-email">
                <Mail size={14} strokeWidth={2.2} />
                {profile.email}
              </div>

              <div className="prof-pill-row">
                <Pill icon={Hash} text={profile.employee_code} />
                {profile.department_name && (
                  <Pill icon={Building2} text={profile.department_name} />
                )}
                {profile.designation_title && (
                  <Pill icon={Briefcase} text={profile.designation_title} />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="row g-3 mb-4">
          <div className="col-12 col-md-4">
            <InfoCard Icon={Phone} label="Phone" value={profile.phone || "—"} />
          </div>
          <div className="col-12 col-md-4">
            <InfoCard
              Icon={Calendar}
              label="Date of Joining"
              value={formatDateShort(profile.date_of_joining)}
            />
          </div>
          <div className="col-12 col-md-4">
            <InfoCard
              Icon={MapPin}
              label="Address"
              value={profile.address || "—"}
              truncate
            />
          </div>
        </div>

        <div className="d-flex justify-content-end mb-4">
          <button
            className="erp-btn erp-btn-outline"
            onClick={() => setEditModal(true)}
            style={{ fontFamily: FONT }}
          >
            <Edit2 size={14} /> Edit Contact Info
          </button>
        </div>

        {/* ✅ Upcoming Holidays Strip */}
        {upcomingHolidays.length > 0 && (
          <div className="holiday-strip">
            <PartyPopper size={16} style={{ flexShrink: 0 }} />
            <span className="holiday-strip-label">Upcoming:</span>
            <div
              style={{
                display: "flex",
                gap: 6,
                flexWrap: "wrap",
                flex: 1,
                minWidth: 0,
              }}
            >
              {upcomingHolidays.map((h) => (
                <span key={h._id} className="holiday-chip">
                  {h.name} · {formatDateShort(h.date).slice(0, 6)}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Summary Cards */}
        <div className="row g-3 mb-4">
          <div className="col-6 col-md-3">
            <SummaryCard
              label="Present"
              value={summary.present_days || 0}
              Icon={CheckCircle2}
              color="#15803d"
              bg="#dcfce7"
            />
          </div>
          <div className="col-6 col-md-3">
            <SummaryCard
              label="Late"
              value={summary.late_days || 0}
              Icon={AlertTriangle}
              color="#b91c1c"
              bg="#fee2e2"
            />
          </div>
          <div className="col-6 col-md-3">
            <SummaryCard
              label="Early"
              value={summary.early_logout_days || 0}
              Icon={Clock}
              color="#b45309"
              bg="#fef3c7"
            />
          </div>
          <div className="col-6 col-md-3">
            <SummaryCard
              label="Hours"
              value={formatHours(summary.total_hours)}
              Icon={TrendingUp}
              color="#4f46e5"
              bg="#eef2ff"
            />
          </div>
        </div>

        {/* Calendar */}
        <div className="erp-card" style={{ padding: 22, marginBottom: 20 }}>
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
              flexWrap: "wrap",
            }}
          >
            <Calendar size={13} strokeWidth={2.5} color="#4f46e5" />
            Attendance Calendar
            <span
              style={{
                marginLeft: "auto",
                fontSize: 10.5,
                fontWeight: 500,
                color: "#9ca3af",
                textTransform: "none",
                letterSpacing: 0,
              }}
            >
              Tap a day to view details
            </span>
          </div>

          {/* Holiday legend */}
          {monthHolidays.length > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 14,
                padding: "8px 12px",
                background: "#fef3c7",
                border: "1px solid #fde68a",
                borderRadius: 8,
                fontSize: 11.5,
                color: "#92400e",
                flexWrap: "wrap",
              }}
            >
              <PartyPopper size={13} />
              <strong>{monthHolidays.length}</strong>
              <span>
                {monthHolidays.length === 1 ? "holiday" : "holidays"} this
                month:
              </span>
              {monthHolidays.map((h) => (
                <span key={h._id} className="holiday-chip">
                  {h.name}
                </span>
              ))}
            </div>
          )}

          {reportLoading ? (
            <div className="text-center py-5" style={{ color: "#9ca3af" }}>
              <div className="spinner-border spinner-border-sm me-2" />
              Loading...
            </div>
          ) : (
            <AttendanceCalendar
              year={year}
              month={month}
              records={records}
              holidays={monthHolidays}    // ✅ NEW
              onPrev={prevMonth}
              onNext={nextMonth}
              canGoNext={canGoNext()}
              selectedDate={selectedDate?.dateStr}
              onDateClick={(cell) => setSelectedDate(cell)}
            />
          )}
        </div>

        {/* Selected Date Details */}
        {selectedDate && selectedRecord && (
          <div
            className="erp-card"
            style={{ padding: 20, background: "#fafafa" }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <div
                style={{
                  fontSize: 14,
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
            </div>

            <div className="row g-2">
              <div className="col-12 col-sm-4">
                <DayTile
                  label="Check In"
                  value={formatTime(selectedRecord.check_in)}
                  Icon={Clock}
                  color={selectedRecord.is_late ? "#b91c1c" : "#15803d"}
                  bg="#ffffff"
                  border={selectedRecord.is_late ? "#fecaca" : "#e5e7eb"}
                  tag={
                    selectedRecord.is_late
                      ? `Late ${selectedRecord.late_minutes}m`
                      : null
                  }
                />
              </div>
              <div className="col-12 col-sm-4">
                <DayTile
                  label="Check Out"
                  value={formatTime(selectedRecord.check_out)}
                  Icon={Clock}
                  color={
                    selectedRecord.is_early_logout ? "#b91c1c" : "#d97706"
                  }
                  bg="#ffffff"
                  border={
                    selectedRecord.is_early_logout ? "#fecaca" : "#e5e7eb"
                  }
                  tag={
                    selectedRecord.is_early_logout
                      ? `Early ${selectedRecord.early_minutes}m`
                      : null
                  }
                />
              </div>
              <div className="col-12 col-sm-4">
                <DayTile
                  label="Worked"
                  value={formatHours(selectedRecord.working_hours)}
                  Icon={TrendingUp}
                  color="#4f46e5"
                  bg="#ffffff"
                  border="#e5e7eb"
                />
              </div>
            </div>

            {selectedRecord.early_logout_reason && (
              <div
                style={{
                  marginTop: 12,
                  padding: 12,
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: 8,
                  fontSize: 12.5,
                  color: "#991b1b",
                }}
              >
                <strong>Reason:</strong>{" "}
                <span style={{ fontStyle: "italic" }}>
                  {selectedRecord.early_logout_reason}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Edit Modal */}
        <Modal
          open={editModal}
          onClose={() => setEditModal(false)}
          title="Edit Contact Info"
          footer={
            <>
              <button
                className="erp-btn erp-btn-outline"
                onClick={() => setEditModal(false)}
                style={{ fontFamily: FONT }}
              >
                Cancel
              </button>
              <button
                className="erp-btn erp-btn-primary"
                onClick={handleProfileSave}
                disabled={saving}
                style={{ fontFamily: FONT }}
              >
                <Save size={14} />
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </>
          }
        >
          <div className="mb-3">
            <label className="erp-label">Phone Number</label>
            <input
              className="erp-input"
              placeholder="+91 98765 43210"
              value={editForm.phone}
              onChange={(e) =>
                setEditForm({ ...editForm, phone: e.target.value })
              }
              style={{ fontFamily: FONT }}
            />
          </div>

          <div className="mb-3">
            <label className="erp-label">Address</label>
            <textarea
              className="erp-input"
              rows={3}
              placeholder="Your address"
              value={editForm.address}
              onChange={(e) =>
                setEditForm({ ...editForm, address: e.target.value })
              }
              style={{ resize: "vertical", fontFamily: FONT }}
            />
          </div>

          <div
            style={{
              padding: 12,
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
              borderRadius: 8,
              fontSize: 12.5,
              color: "#1e40af",
              fontFamily: FONT,
            }}
          >
            <strong>Note:</strong> Other fields like name, email, department can
            only be changed by your manager.
          </div>
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

// ============================================
// Sub-components
// ============================================

const Pill = ({ icon: Icon, text }) => (
  <span
    style={{
      background: "rgba(255,255,255,0.22)",
      backdropFilter: "blur(10px)",
      color: "white",
      padding: "5px 12px",
      borderRadius: 20,
      fontSize: 11.5,
      fontWeight: 700,
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      border: "1px solid rgba(255,255,255,0.25)",
      fontFamily: FONT,
    }}
  >
    <Icon size={11} strokeWidth={2.5} />
    {text}
  </span>
);

const InfoCard = ({ Icon, label, value, truncate }) => (
  <div
    className="erp-card"
    style={{
      padding: 18,
      display: "flex",
      alignItems: "center",
      gap: 14,
      height: "100%",
      fontFamily: FONT,
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
        flexShrink: 0,
      }}
    >
      <Icon size={18} strokeWidth={2.2} />
    </div>
    <div style={{ minWidth: 0, flex: 1 }}>
      <div
        style={{
          color: "#9ca3af",
          fontSize: 10.5,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: 0.5,
          marginBottom: 3,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontWeight: 600,
          fontSize: 13.5,
          color: "#111827",
          overflow: truncate ? "hidden" : "visible",
          textOverflow: truncate ? "ellipsis" : "clip",
          whiteSpace: truncate ? "nowrap" : "normal",
        }}
      >
        {value}
      </div>
    </div>
  </div>
);

const SummaryCard = ({ label, value, Icon, color, bg }) => (
  <div
    className="erp-card"
    style={{
      padding: 16,
      display: "flex",
      alignItems: "center",
      gap: 12,
      fontFamily: FONT,
    }}
  >
    <div
      style={{
        width: 40,
        height: 40,
        borderRadius: 10,
        background: bg,
        color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <Icon size={18} strokeWidth={2.5} />
    </div>
    <div>
      <div
        style={{
          fontSize: 10.5,
          fontWeight: 700,
          color: "#6b7280",
          textTransform: "uppercase",
          letterSpacing: 0.4,
          marginBottom: 3,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 20,
          fontWeight: 800,
          color,
          lineHeight: 1,
          letterSpacing: "-0.3px",
        }}
      >
        {value}
      </div>
    </div>
  </div>
);

const DayTile = ({ label, value, Icon, color, bg, border, tag }) => (
  <div
    style={{
      padding: 14,
      background: bg,
      borderRadius: 12,
      border: `1px solid ${border}`,
      fontFamily: FONT,
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
      <Icon size={11} strokeWidth={2.5} />
      {label}
    </div>
    <div
      style={{
        fontSize: 16,
        fontWeight: 800,
        color,
        fontVariantNumeric: "tabular-nums",
        letterSpacing: "-0.3px",
      }}
    >
      {value}
    </div>
    {tag && (
      <div
        style={{
          fontSize: 10.5,
          color,
          fontWeight: 700,
          marginTop: 5,
          display: "inline-flex",
          alignItems: "center",
          gap: 3,
          background: `${color}15`,
          padding: "2px 7px",
          borderRadius: 6,
        }}
      >
        ⚠ {tag}
      </div>
    )}
  </div>
);

export default EmployeeProfile;