import React, { memo, useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Modal } from '@/components/shared/Modal';
import { FormField } from '@/components/shared/FormField';
import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useAsyncOperation } from '@/hooks/useAsyncOperation';
import { clientApi } from '@/lib/api';
import { insertClientSchema, type Client } from '@shared/schema';
import { z } from 'zod';

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client | null;
  onSuccess?: () => void;
}

const clientFormSchema = insertClientSchema.omit({ 
  licenseeId: true, 
  createdAt: true, 
  updatedAt: true 
});

type ClientFormData = z.infer<typeof clientFormSchema>;

export const ClientModal = memo(({ isOpen, onClose, client, onSuccess }: ClientModalProps) => {
  const [isAdvancedOpen, setIsAdvancedOpen] = React.useState(false);
  const isEditing = !!client;

  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      address: '',
      contactName: '',
      editingPreferences: '',
    },
  });

  const { execute: saveClient, isLoading } = useAsyncOperation({
    successMessage: isEditing ? "Client updated successfully" : "Client created successfully",
    errorMessage: isEditing ? "Failed to update client" : "Failed to create client",
    onSuccess: () => {
      onSuccess?.();
      form.reset();
    },
  });

  const handleSubmit = useCallback(async (data: ClientFormData) => {
    if (isEditing && client) {
      await saveClient(() => clientApi.update(client.id, data));
    } else {
      await saveClient(() => clientApi.create(data));
    }
  }, [isEditing, client, saveClient]);

  const handleClose = useCallback(() => {
    onClose();
    form.reset();
    setIsAdvancedOpen(false);
  }, [onClose, form]);

  useEffect(() => {
    if (client) {
      form.reset({
        name: client.name,
        email: client.email || '',
        phone: client.phone || '',
        address: client.address || '',
        contactName: client.contactName || '',
        editingPreferences: client.editingPreferences || '',
      });
    } else {
      form.reset({
        name: '',
        email: '',
        phone: '',
        address: '',
        contactName: '',
        editingPreferences: '',
      });
    }
  }, [client, form]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEditing ? "Edit Client" : "Add New Client"}
      size="lg"
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Company Name *</label>
              <input
                {...form.register('name')}
                type="text"
                placeholder="Enter company name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email Address</label>
              <input
                {...form.register('email')}
                type="email"
                placeholder="Enter email address"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Phone Number</label>
              <input
                {...form.register('phone')}
                type="tel"
                placeholder="Enter phone number"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Contact Person</label>
              <input
                {...form.register('contactName')}
                type="text"
                placeholder="Enter contact person name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Address</label>
            <textarea
              {...form.register('address')}
              placeholder="Enter full address"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
            <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900">
              {isAdvancedOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              Advanced Settings
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Editing Preferences</label>
                <textarea
                  {...form.register('editingPreferences')}
                  placeholder="Enter specific editing preferences and instructions..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
                <p className="text-xs text-gray-500">These preferences will be automatically included in job cards for consistent editing requirements.</p>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? 'Saving...' : (isEditing ? 'Update Client' : 'Create Client')}
            </Button>
          </div>
        </form>
      </Form>
    </Modal>
  );
});

ClientModal.displayName = 'ClientModal';