import React, { memo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Users, Calendar, Camera } from 'lucide-react';
import { useLocation } from 'wouter';
import { Modal } from '@/components/shared/Modal';
import { BookingForm } from '@/components/forms/BookingForm';

export const QuickActions = memo(() => {
  const [, setLocation] = useLocation();
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  const quickActions = [
    {
      title: 'New Booking',
      description: 'Schedule a new photo shoot',
      icon: Plus,
      action: () => setIsBookingModalOpen(true),
      color: 'bg-blue-600 hover:bg-blue-700',
    },
    {
      title: 'Add Client',
      description: 'Create a new client profile',
      icon: Users,
      action: () => setLocation('/clients'),
      color: 'bg-green-600 hover:bg-green-700',
    },
    {
      title: 'View Calendar',
      description: 'Check schedule and availability',
      icon: Calendar,
      action: () => setLocation('/calendar'),
      color: 'bg-purple-600 hover:bg-purple-700',
    },
    {
      title: 'Production Hub',
      description: 'Manage ongoing projects',
      icon: Camera,
      action: () => setLocation('/production'),
      color: 'bg-orange-600 hover:bg-orange-700',
    },
  ];

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Button
                  key={action.title}
                  variant="ghost"
                  className="w-full justify-start h-auto p-4"
                  onClick={action.action}
                >
                  <div className={`p-2 rounded-md mr-3 ${action.color}`}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium">{action.title}</div>
                    <div className="text-sm text-gray-500">{action.description}</div>
                  </div>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Modal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        title="Create New Booking"
        size="xl"
      >
        <BookingForm
          onSuccess={() => setIsBookingModalOpen(false)}
          onCancel={() => setIsBookingModalOpen(false)}
        />
      </Modal>
    </>
  );
});

QuickActions.displayName = 'QuickActions';