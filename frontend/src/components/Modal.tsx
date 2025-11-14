import type { ReactNode } from 'react';
import './Modal.css';

type ModalProps = {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
};

export function Modal({ title, description, onClose, children }: ModalProps) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal">
        <div className="modal__header">
          <div>
            <h3>{title}</h3>
            {description && <p>{description}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Kapat">
            ✕
          </button>
        </div>
        <div className="modal__content">{children}</div>
      </div>
    </div>
  );
}
