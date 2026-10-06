import { useRef, useState } from "react";
import { Upload, X, FileText, Image as ImageIcon, Loader2 } from "lucide-react";
import { uploadAttachment } from "../../api/announcementApi";

const MAX_FILES = 5;
const MAX_SIZE = 5 * 1024 * 1024;

const getFileIcon = (mimeType) => {
  if (mimeType?.startsWith("image/")) return ImageIcon;
  return FileText;
};

const formatSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

const FileUpload = ({ files, onChange }) => {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleSelect = async (e) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length === 0) return;

    if (files.length + selected.length > MAX_FILES) {
      alert(`Maximum ${MAX_FILES} files allowed`);
      return;
    }

    setUploading(true);
    try {
      const uploaded = [];
      for (const file of selected) {
        if (file.size > MAX_SIZE) {
          alert(`${file.name} is too large (max 5MB)`);
          continue;
        }
        const res = await uploadAttachment(file);
        uploaded.push(res.data);
      }
      onChange([...files, ...uploaded]);
    } catch (err) {
      alert(err.response?.data?.error || "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const removeFile = (fileId) => {
    onChange(files.filter((f) => f.file_id !== fileId));
  };

  return (
    <div>
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        style={{
          border: "2px dashed #d1d5db",
          borderRadius: 10,
          padding: 20,
          textAlign: "center",
          cursor: uploading ? "wait" : "pointer",
          background: "#fafafa",
          transition: "all 0.15s",
        }}
        onMouseEnter={(e) => {
          if (!uploading) e.currentTarget.style.borderColor = "#4f46e5";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "#d1d5db";
        }}
      >
        {uploading ? (
          <>
            <Loader2
              size={24}
              color="#4f46e5"
              style={{ animation: "spin 1s linear infinite" }}
            />
            <div style={{ marginTop: 8, fontSize: 13, color: "#6b7280" }}>
              Uploading...
            </div>
          </>
        ) : (
          <>
            <Upload size={24} color="#6b7280" />
            <div
              style={{
                marginTop: 8,
                fontSize: 13,
                fontWeight: 600,
                color: "#111827",
              }}
            >
              Click to upload files
            </div>
            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
              PDF, DOC, XLS, JPG, PNG · Max 5 files · 5MB each
            </div>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          multiple
          style={{ display: "none" }}
          onChange={handleSelect}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp,.txt,.csv,.zip"
        />
      </div>

      {files.length > 0 && (
        <div style={{ marginTop: 10 }}>
          {files.map((f) => {
            const Icon = getFileIcon(f.mime_type);
            return (
              <div
                key={f.file_id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 12px",
                  background: "#f9fafb",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  marginBottom: 6,
                }}
              >
                <Icon size={16} color="#4f46e5" />
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
                    {f.file_name}
                  </div>
                  <div style={{ fontSize: 11, color: "#6b7280" }}>
                    {formatSize(f.file_size)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(f.file_id)}
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
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FileUpload;