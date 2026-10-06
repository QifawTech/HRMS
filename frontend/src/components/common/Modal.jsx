import { X } from "lucide-react";

const Modal = ({ open, onClose, title, children, footer }) => {
  if (!open) return null;

  return (
    <>
      <div className="erp-modal-backdrop" onClick={onClose} />
      <div className="erp-modal">
        <div className="erp-modal-header">
          <h3 className="erp-modal-title">{title}</h3>
          <button className="erp-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="erp-modal-body">{children}</div>
        {footer && <div className="erp-modal-footer">{footer}</div>}
      </div>
    </>
  );
};

export default Modal;