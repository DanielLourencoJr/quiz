import { createContext, useContext, useState, useCallback, useEffect } from "react";

const ToastContext = createContext(null);

let _showToast = null;
export function showToast(msg, type = "default") {
  if (_showToast) _showToast(msg, type);
}

export function Toast() {
  const [toast, setToast] = useState(null);

  useEffect(() => {
    _showToast = (msg, type) => {
      setToast({ msg, type });
      setTimeout(() => setToast(null), 2500);
    };
    return () => { _showToast = null; };
  }, []);

  if (!toast) return null;
  return (
    <div className={`toast ${toast.type}`}>
      {toast.type === "success" && "✓ "}
      {toast.type === "error"   && "✗ "}
      {toast.msg}
    </div>
  );
}

export default Toast;
