import React, { memo, useState, useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FormField } from '@/components/shared/FormField';
import { MapPin, Calendar, Clock, Camera, Home, Video, ChevronLeft, ChevronRight, Mail } from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';
import { TimePicker } from '@/components/ui/time-picker';
import { useAsyncOperation } from '@/hooks/useAsyncOperation';
import { API_ENDPOINTS } from '@/utils/constants';
import { insertBookingSchema } from '@shared/schema';
import { z } from 'zod';

interface BookingFormProps {
  onSuccess?: (booking: any) => void;
  onCancel?: () => void;
  initialData?: any;
}

type BookingFormData = z.infer<typeof insertBookingSchema>;

const BOOKING_STEPS = [
  { id: 1, title: 'Client Information', description: 'Select or create client' },
  { id: 2, title: 'Service Selection', description: 'Choose services and pricing' },
  { id: 3, title: 'Date & Time', description: 'Schedule appointment' },
  { id: 4, title: 'Order Summary', description: 'Review and confirm' },
];

export const BookingForm = memo(({ onSuccess, onCancel, initialData }: BookingFormProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedProducts, setSelectedProducts] = useState<any[]>([]);

  const form = useForm<BookingFormData>({
    resolver: zodResolver(insertBookingSchema.omit({ licenseeId: true })),
    defaultValues: {
      clientId: 0,
      propertyAddress: '',
      scheduledDate: '',
      scheduledTime: '',
      services: [],
      notes: '',
      price: '0',
      photographerId: undefined,
      sendConfirmationEmail: true,
    },
  });

  const { data: clients } = useQuery({
    queryKey: [API_ENDPOINTS.CLIENTS],
  });

  const { data: products } = useQuery({
    queryKey: [API_ENDPOINTS.PRODUCTS],
  });

  const { data: photographers } = useQuery({
    queryKey: [API_ENDPOINTS.PHOTOGRAPHERS],
  });

  const { execute: createBooking, isLoading } = useAsyncOperation({
    successMessage: "Booking created successfully",
    errorMessage: "Failed to create booking",
    onSuccess: (booking) => {
      onSuccess?.(booking);
      form.reset();
      setCurrentStep(1);
      setSelectedProducts([]);
    },
  });

  const handleSubmit = useCallback(async (data: BookingFormData) => {
    await createBooking(async () => {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create booking');
      }
      
      return response.json();
    });
  }, [createBooking]);

  const handleNext = useCallback(() => {
    if (currentStep < BOOKING_STEPS.length) {
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep]);

  const handlePrevious = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const calculateTotalPrice = useCallback(() => {
    return selectedProducts.reduce((total, product) => total + (product.price || 0), 0);
  }, [selectedProducts]);

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <FormField
              {...form.register('clientId')}
              type="select"
              label="Client"
              placeholder="Select a client"
              options={clients?.map(client => ({
                value: client.id.toString(),
                label: client.name,
              })) || []}
              required
            />
            <FormField
              {...form.register('propertyAddress')}
              type="textarea"
              label="Property Address"
              placeholder="Enter the complete property address"
              required
            />
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Select Services</h3>
            <div className="grid gap-4 md:grid-cols-2">
              {products?.map((product) => (
                <Card key={product.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-base">{product.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-3">{product.description}</p>
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">From ${product.basePrice}</span>
                      <Button size="sm" variant="outline">
                        Add Service
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Date</label>
                <DatePicker
                  value={form.watch('scheduledDate')}
                  onChange={(date) => form.setValue('scheduledDate', date)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Time</label>
                <TimePicker
                  value={form.watch('scheduledTime')}
                  onChange={(time) => form.setValue('scheduledTime', time)}
                />
              </div>
            </div>
            <FormField
              {...form.register('photographerId')}
              type="select"
              label="Photographer (Optional)"
              placeholder="Select a photographer"
              options={photographers?.map(photographer => ({
                value: photographer.id.toString(),
                label: photographer.name,
              })) || []}
            />
            <FormField
              {...form.register('notes')}
              type="textarea"
              label="Additional Notes"
              placeholder="Any special instructions or requirements"
            />
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Order Summary</h3>
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Client:</span>
                    <span className="font-medium">
                      {clients?.find(c => c.id === parseInt(form.watch('clientId')))?.name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Property:</span>
                    <span className="font-medium">{form.watch('propertyAddress')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Date & Time:</span>
                    <span className="font-medium">
                      {form.watch('scheduledDate')} at {form.watch('scheduledTime')}
                    </span>
                  </div>
                  <div className="border-t pt-3">
                    <div className="flex justify-between font-semibold">
                      <span>Total:</span>
                      <span>${calculateTotalPrice()}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {BOOKING_STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                ${currentStep >= step.id 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-600'
                }
              `}>
                {step.id}
              </div>
              {index < BOOKING_STEPS.length - 1 && (
                <div className={`
                  h-1 w-24 ml-4
                  ${currentStep > step.id ? 'bg-blue-600' : 'bg-gray-200'}
                `} />
              )}
            </div>
          ))}
        </div>
        <div className="mt-4">
          <h2 className="text-xl font-semibold">{BOOKING_STEPS[currentStep - 1].title}</h2>
          <p className="text-gray-600">{BOOKING_STEPS[currentStep - 1].description}</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <Card>
            <CardContent className="pt-6">
              {renderStepContent()}
            </CardContent>
          </Card>

          <div className="flex justify-between mt-6">
            <div className="flex gap-3">
              {currentStep > 1 && (
                <Button type="button" variant="outline" onClick={handlePrevious}>
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>
              )}
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            </div>
            
            <div>
              {currentStep < BOOKING_STEPS.length ? (
                <Button type="button" onClick={handleNext}>
                  Next
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Creating...' : 'Create Booking'}
                </Button>
              )}
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
});

BookingForm.displayName = 'BookingForm';