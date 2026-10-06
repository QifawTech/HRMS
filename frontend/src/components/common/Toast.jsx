import { useEffect } from "react";
import { CheckCircle2, AlertCircle, X } from "lucide-react";

const Toast = ({ message, type = "success", onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3500);
    return () => clearTimeout(timer);
  }, [onClose]);

  const Icon = type === "success" ? CheckCircle2 : AlertCircle;

  return (
    <div className={`erp-toast erp-toast-${type}`}>
      <Icon size={18} />
      <span>{message}</span>
      <button onClick={onClose} className="erp-toast-close">
        <X size={14} />
      </button>
    </div>
  );
};

export default Toast;