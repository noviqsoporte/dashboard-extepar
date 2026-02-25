import { useEffect } from 'react';

export default function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  if (!message) return null;
  return (
    <div className={`toast toast-${type}`} onClick={onClose}>
      {message}
    </div>
  );
}
