import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight } from "lucide-react";
import { insertClientSchema, type Client } from "@shared/schema";
import { z } from "zod";

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client | null;
}

const clientFormSchema = insertClientSchema.omit({ 
  licenseeId: true, 
  createdAt: true, 
  updatedAt: true 
});

type ClientFormData = z.infer<typeof clientFormSchema>;

export default function ClientModal({ isOpen, onClose, client }: ClientModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedSections, setExpandedSections] = useState({
    customerDetails: true,
    billingPreferences: false,
    teamMembers: false,
    customerNotes: false,
    editingPreferences: false,
  });

  const isEditing = !!client;

  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      address: "",
      contactName: "",
      editingPreferences: "",
    },
  });

  useEffect(() => {
    if (client) {
      form.reset({
        name: client.name || "",
        email: client.email || "",
        phone: client.phone || "",
        address: client.address || "",
        contactName: client.contactName || "",
        editingPreferences: client.editingPreferences || "",
      });
    } else {
      form.reset({
        name: "",
        email: "",
        phone: "",
        address: "",
        contactName: "",
        editingPreferences: "",
      });
    }
  }, [client, form]);

  const createClientMutation = useMutation({
    mutationFn: async (data: ClientFormData) => {
      return apiRequest("/api/clients", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Client created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      handleClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create client",
        variant: "destructive",
      });
    },
  });

  const updateClientMutation = useMutation({
    mutationFn: async (data: ClientFormData) => {
      return apiRequest(`/api/clients/${client?.id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Client updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      handleClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update client",
        variant: "destructive",
      });
    },
  });

  const handleClose = () => {
    form.reset();
    setExpandedSections({
      customerDetails: true,
      billingPreferences: false,
      teamMembers: false,
      customerNotes: false,
      editingPreferences: false,
    });
    onClose();
  };

  const onSubmit = (data: ClientFormData) => {
    if (isEditing) {
      updateClientMutation.mutate(data);
    } else {
      createClientMutation.mutate(data);
    }
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Client" : "Add New Client"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Customer Details */}
            <Collapsible 
              open={expandedSections.customerDetails}
              onOpenChange={() => toggleSection('customerDetails')}
            >
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-0 font-semibold">
                  <span>Customer Details</span>
                  {expandedSections.customerDetails ? 
                    <ChevronDown className="h-4 w-4" /> : 
                    <ChevronRight className="h-4 w-4" />
                  }
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business Name *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter business name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="contactName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Person</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Primary contact name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address *</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" placeholder="client@email.com" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Phone number" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Address</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Business address" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CollapsibleContent>
            </Collapsible>

            {/* Editing Preferences */}
            <Collapsible 
              open={expandedSections.editingPreferences}
              onOpenChange={() => toggleSection('editingPreferences')}
            >
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-0 font-semibold">
                  <span>Editing Preferences</span>
                  {expandedSections.editingPreferences ? 
                    <ChevronDown className="h-4 w-4" /> : 
                    <ChevronRight className="h-4 w-4" />
                  }
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="editingPreferences"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client Editing Preferences</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="Enter specific editing preferences, style requirements, or special instructions for this client's jobs..."
                          rows={4}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CollapsibleContent>
            </Collapsible>

            {/* Billing Preferences */}
            <Collapsible 
              open={expandedSections.billingPreferences}
              onOpenChange={() => toggleSection('billingPreferences')}
            >
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-0 font-semibold">
                  <span>Billing Preferences (Optional)</span>
                  {expandedSections.billingPreferences ? 
                    <ChevronDown className="h-4 w-4" /> : 
                    <ChevronRight className="h-4 w-4" />
                  }
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 mt-4">
                <div className="text-sm text-gray-600 p-3 bg-gray-50 rounded">
                  Billing preferences will be available in future updates
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Team Members */}
            <Collapsible 
              open={expandedSections.teamMembers}
              onOpenChange={() => toggleSection('teamMembers')}
            >
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-0 font-semibold">
                  <span>Team Members (Optional)</span>
                  {expandedSections.teamMembers ? 
                    <ChevronDown className="h-4 w-4" /> : 
                    <ChevronRight className="h-4 w-4" />
                  }
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 mt-4">
                <div className="text-sm text-gray-600 p-3 bg-gray-50 rounded">
                  Team member management will be available in future updates
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Customer Notes */}
            <Collapsible 
              open={expandedSections.customerNotes}
              onOpenChange={() => toggleSection('customerNotes')}
            >
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-0 font-semibold">
                  <span>Customer Notes (Optional)</span>
                  {expandedSections.customerNotes ? 
                    <ChevronDown className="h-4 w-4" /> : 
                    <ChevronRight className="h-4 w-4" />
                  }
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 mt-4">
                <div className="text-sm text-gray-600 p-3 bg-gray-50 rounded">
                  Customer notes functionality will be available in future updates
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-brand-blue hover:bg-blue-700"
                disabled={createClientMutation.isPending || updateClientMutation.isPending}
              >
                {createClientMutation.isPending || updateClientMutation.isPending
                  ? "Saving..."
                  : isEditing
                  ? "Update Client"
                  : "Create Client"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}