import { AlertCircle, CheckCircle } from "lucide-react";

interface ServiceValidationProps {
  selectedCount: number;
  required?: boolean;
}

export function ServiceValidation({ selectedCount, required = true }: ServiceValidationProps) {
  if (!required) return null;
  
  if (selectedCount === 0) {
    return (
      <div className="flex items-center text-red-600 text-sm mt-2">
        <AlertCircle className="h-4 w-4 mr-1" />
        Please select at least one service
      </div>
    );
  }
  
  return (
    <div className="flex items-center text-green-600 text-sm mt-2">
      <CheckCircle className="h-4 w-4 mr-1" />
      {selectedCount} service{selectedCount > 1 ? 's' : ''} selected
    </div>
  );
}