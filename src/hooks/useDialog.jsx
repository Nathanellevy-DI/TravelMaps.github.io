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
