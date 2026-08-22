import { FaExclamationTriangle, FaTimes } from 'react-icons/fa'

function ConfirmDialog({ title, message, confirmLabel = 'Delete Team', onCancel, onConfirm }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={onCancel}><section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" onMouseDown={(event) => event.stopPropagation()}><button className="icon-button dialog-close" onClick={onCancel} aria-label="Close dialog"><FaTimes /></button><div className="dialog-icon"><FaExclamationTriangle /></div><h2 id="confirm-title">{title}</h2><p>{message}</p><div className="modal-actions"><button className="button button-secondary" onClick={onCancel}>Cancel</button><button className="button button-danger" onClick={onConfirm}>{confirmLabel}</button></div></section></div>
}

export default ConfirmDialog
