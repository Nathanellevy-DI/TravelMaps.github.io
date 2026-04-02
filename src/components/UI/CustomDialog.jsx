/**
 * CustomDialog.jsx — Reusable Modal Dialog Component
 *
 * Replaces native browser dialogs (alert, confirm, prompt) with a
 * styled modal that matches the app's dark glassmorphism theme.
 *
 * Dialog types:
 *   - 'prompt'  — Text input with confirm/cancel (returns the entered value)
 *   - 'confirm' — Yes/No question with confirm/cancel (returns boolean)
 *   - 'danger'  — Destructive confirmation (red Delete button)
 *   - 'alert'   — Information-only with OK button
 *
 * Used via the useDialog() hook, which manages the dialog state and
 * returns Promise-based showPrompt(), showConfirm(), and showAlert() functions.
 *
 * @param {Object}   props
 * @param {string}   props.type         — 'prompt' | 'confirm' | 'danger' | 'alert'
 * @param {string}   props.title        — Dialog title text
 * @param {string}   props.message      — Dialog body text / input placeholder
 * @param {string}   props.defaultValue — Default value for prompt input (prompt only)
 * @param {Function} props.onConfirm    — Called on confirm (with input value for prompts)
 * @param {Function} props.onCancel     — Called on cancel or overlay click
 */
import { useState } from 'react';
import { AlertCircle, HelpCircle, Trash2 } from 'lucide-react';

export default function CustomDialog({ type, title, message, defaultValue, onConfirm, onCancel }) {
    const [inputValue, setInputValue] = useState(defaultValue || '');

    const handleConfirm = () => {
        if (type === 'prompt') {
            onConfirm(inputValue);
        } else {
            onConfirm();
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && type === 'prompt') {
            handleConfirm();
        }
    };

    const getIcon = () => {
        switch (type) {
            case 'confirm':
                return <HelpCircle size={48} color="#3ea6ff" />;
            case 'alert':
                return <AlertCircle size={48} color="#f1c40f" />;
            case 'danger':
                return <Trash2 size={48} color="#ff6961" />;
            default:
                return null;
        }
    };

    return (
        <div className="custom-dialog-overlay" onClick={onCancel}>
            <div className="custom-dialog" onClick={(e) => e.stopPropagation()}>
                {getIcon()}
                <h3 className="custom-dialog-title">{title}</h3>
                {message && <p className="custom-dialog-message">{message}</p>}

                {type === 'prompt' && (
                    <input
                        type="text"
                        className="custom-dialog-input"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={message}
                        autoFocus
                    />
                )}

                <div className="custom-dialog-actions">
                    {type !== 'alert' && (
                        <button className="secondary" onClick={onCancel}>
                            Cancel
                        </button>
                    )}
                    <button
                        className={type === 'danger' ? 'danger' : 'primary'}
                        onClick={handleConfirm}
                    >
                        {type === 'alert' ? 'OK' : type === 'danger' ? 'Delete' : 'Confirm'}
                    </button>
                </div>
            </div>
        </div>
    );
}
