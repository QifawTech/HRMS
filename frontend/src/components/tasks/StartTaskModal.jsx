import { useState, useRef } from "react";
import { Upload, X, FileText } from "lucide-react";
import Modal from "../common/Modal";
import * as api from "../../api/taskApi";

const StartTaskModal = ({ open, task, onClose, onSuccess }) => {
  const [textPlan, setTextPlan] = useState(task?.workflow_plan?.text_plan || "");
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  const isResubmit = task?.status === "Changes Requested";

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;

    const allowed = [
      "pdf", "doc", "docx", "xls", "xlsx",
      "jpg", "jpeg", "png", "txt", "zip",
    ];
    const ext = f.name.split(".").pop().toLowerCase();

    if (!allowed.includes(ext)) {
      setError("File type not allowed");
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setError("File too large (max 5MB)");
      return;
    }

    setFile(f);
    setError("");
  };

  const handleSubmit = async () => {
    if (!textPlan.trim() && !file) {
      setError("Provide plan text or upload file");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      await api.submitPlan(task._id, textPlan, file);
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  const formatSize = (b) => {
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${Math.round(b / 1024)} KB`;
    return `${(b / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isResubmit ? "Resubmit Plan" : "Start Task - Submit Plan"}
      footer={
        <>
          <button
            className="erp-btn erp-btn-outline"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            className="erp-btn erp-btn-primary"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? "Submitting..." : isResubmit ? "Resubmit Plan" : "Submit Plan"}
          </button>
        </>
      }
    >
      {/* Change request comment from manager */}
      {isResubmit && task?.plan_review_comment && (
        <div
          style={{
            padding: 12,
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: 8,
            marginBottom: 16,
            fontSize: 13,
            color: "#991b1b",
          }}
        >
          <strong>Manager's feedback:</strong> {task.plan_review_comment}
        </div>
      )}

      {/* Task info */}
      {task && (
        <div
          style={{
            padding: 12,
            background: "#f9fafb",
            borderRadius: 8,
            marginBottom: 16,
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
            {task.title}
          </div>
          {task.description && (
            <div style={{ fontSize: 12.5, color: "#6b7280" }}>
              {task.description}
            </div>
          )}
        </div>
      )}

      {/* Text plan */}
      <div className="mb-3">
        <label className="erp-label">Your Plan / Approach *</label>
        <textarea
          className="erp-input"
          rows={5}
          placeholder="Describe your approach, architecture, steps..."
          value={textPlan}
          onChange={(e) => setTextPlan(e.target.value)}
          style={{ resize: "vertical" }}
        />
      </div>

      {/* File upload */}
      <div className="mb-2">
        <label className="erp-label">Attach Workflow / Architecture File (Optional)</label>

        {!file ? (
          <div
            onClick={() => fileRef.current?.click()}
            style={{
              border: "2px dashed #d1d5db",
              borderRadius: 10,
              padding: 20,
              textAlign: "center",
              cursor: "pointer",
              background: "#fafafa",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#4f46e5")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#d1d5db")}
          >
            <Upload size={22} color="#6b7280" />
            <div
              style={{
                marginTop: 8,
                fontSize: 13,
                fontWeight: 600,
                color: "#111827",
              }}
            >
              Click to upload workflow / architecture
            </div>
            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
              PDF, DOC, Image, ZIP · Max 5MB
            </div>
            <input
              ref={fileRef}
              type="file"
              style={{ display: "none" }}
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.txt,.zip"
            />
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 12px",
              background: "#f9fafb",
              border: "1px solid var(--border)",
              borderRadius: 8,
            }}
          >
            <FileText size={18} color="#4f46e5" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {file.name}
              </div>
              <div style={{ fontSize: 11, color: "#6b7280" }}>
                {formatSize(file.size)}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setFile(null)}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "#9ca3af",
                padding: 4,
              }}
            >
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      {error && (
        <div
          style={{
            padding: 10,
            background: "#fef2f2",
            color: "#991b1b",
            borderRadius: 8,
            fontSize: 12.5,
            marginTop: 8,
          }}
        >
          {error}
        </div>
      )}
    </Modal>
  );
};

export default StartTaskModal;