/**
 * Toast hook wrapper for sonner
 * This provides a compatibility layer for components expecting use-toast
 */
import { toast as sonnerToast } from 'sonner';

export interface ToastProps {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

export function useToast() {
  return {
    toast: ({ title, description, variant }: ToastProps) => {
      if (variant === 'destructive') {
        sonnerToast.error(title || description || 'Error');
      } else {
        sonnerToast.success(title || description || 'Success');
      }
    },
  };
}
