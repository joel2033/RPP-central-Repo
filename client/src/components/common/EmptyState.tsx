import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const EmptyState = ({ icon, title, description, action, className }: EmptyStateProps) => {
  return (
    <Card className={className}>
      <CardContent className="p-12">
        <div className="flex flex-col items-center justify-center text-center space-y-4">
          <div className="text-gray-400">
            {icon}
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500 max-w-md">{description}</p>
          </div>
          {action && (
            <Button onClick={action.onClick} className="mt-4">
              {action.label}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};