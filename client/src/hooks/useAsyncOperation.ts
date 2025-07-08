import { useState, useCallback } from 'react';
import { useToast } from './use-toast';

interface AsyncOperationOptions {
  onSuccess?: (data?: any) => void;
  onError?: (error: Error) => void;
  successMessage?: string;
  errorMessage?: string;
}

export const useAsyncOperation = (options: AsyncOperationOptions = {}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  const execute = useCallback(async (operation: () => Promise<any>) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await operation();
      
      if (options.successMessage) {
        toast({
          title: 'Success',
          description: options.successMessage,
        });
      }
      
      options.onSuccess?.(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Operation failed');
      setError(error);
      
      if (options.errorMessage) {
        toast({
          title: 'Error',
          description: options.errorMessage,
          variant: 'destructive',
        });
      }
      
      options.onError?.(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [options, toast]);

  return {
    execute,
    isLoading,
    error,
  };
};