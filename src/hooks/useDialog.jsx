/**
 * useDialog.jsx — Custom Dialog Hook
 *
 * A React hook that provides Promise-based modal dialogs as replacements
 * for native browser `alert()`, `confirm()`, and `prompt()` functions.
 *
 * Usage:
 *   const { showPrompt, showConfirm, showAlert, DialogComponent } = useDialog();
 *
 *   // Show a text input dialog (returns the entered string or null)
 *   const name = await showPrompt('Title', 'Enter name', 'Default');
 *
 *   // Show a yes/no confirmation (returns true or false)
 *   const ok = await showConfirm('Title', 'Are you sure?');
 *
 *   // Show a destructive confirmation (red button, returns true or false)
 *   const ok = await showConfirm('Title', 'Delete this?', true);
 *
 *   // Show an info alert (returns void)
 *   await showAlert('Title', 'Something happened');
 *
 * IMPORTANT: You must render {DialogComponent} in your JSX for the dialog to appear.
 */
import { useState, useCallback } from 'react';
import CustomDialog from '../components/UI/CustomDialog';

export function useDialog() {
    const [dialog, setDialog] = useState(null);

    const showPrompt = useCallback((title, message, defaultValue = '') => {
        return new Promise((resolve) => {
            setDialog({
                type: 'prompt',
                title,
                message,
                defaultValue,
                onConfirm: (value) => {
                    setDialog(null);
                    resolve(value);
                },
                onCancel: () => {
                    setDialog(null);
                    resolve(null);
                }
            });
        });
    }, []);

    const showConfirm = useCallback((title, message, isDanger = false) => {
        return new Promise((resolve) => {
            setDialog({
                type: isDanger ? 'danger' : 'confirm',
                title,
                message,
                onConfirm: () => {
                    setDialog(null);
                    resolve(true);
                },
                onCancel: () => {
                    setDialog(null);
                    resolve(false);
                }
            });
        });
    }, []);

    const showAlert = useCallback((title, message) => {
        return new Promise((resolve) => {
            setDialog({
                type: 'alert',
                title,
                message,
                onConfirm: () => {
                    setDialog(null);
                    resolve();
                },
                onCancel: () => {
                    setDialog(null);
                    resolve();
                }
            });
        });
    }, []);

    const DialogComponent = dialog ? <CustomDialog {...dialog} /> : null;

    return { showPrompt, showConfirm, showAlert, DialogComponent };
}
