import { useState, useCallback } from 'react';

interface ConfirmDialogState {
  isOpen: boolean;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
  onConfirm?: () => void;
}

export const useConfirmDialog = () => {
  const [state, setState] = useState<ConfirmDialogState>({
    isOpen: false,
  });

  const openConfirmDialog = useCallback((options: Omit<ConfirmDialogState, 'isOpen'>) => {
    setState({
      ...options,
      isOpen: true,
    });
  }, []);

  const closeConfirmDialog = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: false }));
  }, []);

  const handleConfirm = useCallback(() => {
    state.onConfirm?.();
    closeConfirmDialog();
  }, [state.onConfirm, closeConfirmDialog]);

  return {
    confirmDialog: state,
    openConfirmDialog,
    closeConfirmDialog,
    handleConfirm,
  };
};