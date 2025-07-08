import React, { memo, useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Users, Building2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Layout } from "@/components/layout/Layout";
import { AsyncBoundary } from "@/components/shared/AsyncBoundary";
import { Button } from "@/components/ui/button";
import { SearchAndFilter } from "@/components/common/SearchAndFilter";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { useFilters } from "@/hooks/useFilters";
import { useAsyncOperation } from "@/hooks/useAsyncOperation";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { clientApi, officeApi } from "@/lib/api";
import { Edit, Mail, Phone, MapPin } from "lucide-react";
import { API_ENDPOINTS } from "@/utils/constants";
import { ClientCard } from "./components/ClientCard";
import { ClientModal } from "./components/ClientModal";
import { OfficeModal } from "@/components/modals/office-modal";
import type { Client } from "@shared/schema";

const statusOptions = [
  { value: 'all', label: 'All Clients' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

const ClientsContent = memo(() => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isOfficeModalOpen, setIsOfficeModalOpen] = useState(false);
  const [selectedOffice, setSelectedOffice] = useState<any>(null);
  const { confirmDialog, openConfirmDialog, closeConfirmDialog, handleConfirm } = useConfirmDialog();

  const { data: clients, isLoading } = useQuery<Client[]>({
    queryKey: [API_ENDPOINTS.CLIENTS],
    staleTime: 5 * 60 * 1000,
  });

  const { data: offices = [], isLoading: isOfficesLoading } = useQuery({
    queryKey: ['/api/offices'],
    queryFn: officeApi.getAll,
    staleTime: 5 * 60 * 1000,
  });

  const clientFilterFn = useCallback((client: Client, filters: any) => {
    const searchLower = filters.searchTerm.toLowerCase();
    return (
      client.name.toLowerCase().includes(searchLower) ||
      client.email?.toLowerCase().includes(searchLower) ||
      client.contactName?.toLowerCase().includes(searchLower)
    );
  }, []);

  const {
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    filteredData: filteredClients,
  } = useFilters(clients, clientFilterFn);

  const { execute: deleteClient, isLoading: isDeleting } = useAsyncOperation({
    successMessage: "Client deleted successfully",
    errorMessage: "Failed to delete client",
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.CLIENTS] });
    },
  });

  const handleAddClient = useCallback(() => {
    setSelectedClient(null);
    setIsModalOpen(true);
  }, []);

  const handleEditClient = useCallback((client: Client) => {
    setSelectedClient(client);
    setIsModalOpen(true);
  }, []);

  const handleDeleteClient = useCallback((client: Client) => {
    openConfirmDialog({
      title: 'Delete Client',
      description: `Are you sure you want to delete ${client.name}? This action cannot be undone.`,
      confirmText: 'Delete',
      variant: 'destructive',
      onConfirm: () => deleteClient(() => clientApi.delete(client.id)),
    });
  }, [openConfirmDialog, deleteClient]);

  const handleModalSuccess = useCallback(() => {
    setIsModalOpen(false);
    setSelectedClient(null);
    queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.CLIENTS] });
  }, [queryClient]);

  const handleAddOffice = useCallback(() => {
    setSelectedOffice(null);
    setIsOfficeModalOpen(true);
  }, []);

  const handleEditOffice = useCallback((office: any) => {
    setSelectedOffice(office);
    setIsOfficeModalOpen(true);
  }, []);

  const handleOfficeModalSuccess = useCallback(() => {
    setIsOfficeModalOpen(false);
    setSelectedOffice(null);
    queryClient.invalidateQueries({ queryKey: ['/api/offices'] });
  }, [queryClient]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients & Offices</h1>
          <p className="text-gray-600">Manage your client relationships and office configurations</p>
        </div>
      </div>

      <Tabs defaultValue="clients" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="clients" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Clients
          </TabsTrigger>
          <TabsTrigger value="offices" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Offices
          </TabsTrigger>
        </TabsList>

        <TabsContent value="clients" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold">Client Management</h2>
              <p className="text-sm text-gray-600">Manage your client relationships</p>
            </div>
            <Button onClick={handleAddClient} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Client
            </Button>
          </div>

          <SearchAndFilter
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            statusOptions={statusOptions}
            placeholder="Search clients by name, email, or contact..."
          />

          {filteredClients.length === 0 ? (
            <EmptyState
              icon={<Users className="h-12 w-12" />}
              title="No clients found"
              description="Get started by adding your first client to begin managing relationships."
              action={{
                label: "Add Client",
                onClick: handleAddClient,
              }}
            />
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredClients.map((client) => (
                <ClientCard
                  key={client.id}
                  client={client}
                  onEdit={handleEditClient}
                  onDelete={handleDeleteClient}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="offices" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold">Office Management</h2>
              <p className="text-sm text-gray-600">Configure billing details, branding, and templates</p>
            </div>
            <Button onClick={handleAddOffice} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Office
            </Button>
          </div>

          {offices.length === 0 ? (
            <EmptyState
              icon={<Building2 className="h-12 w-12" />}
              title="No offices found"
              description="Create your first office to organize clients and configure billing details."
              action={{
                label: "Add Office",
                onClick: handleAddOffice,
              }}
            />
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {offices.map((office: any) => (
                <div key={office.id} className="bg-white rounded-lg border p-6 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">{office.name}</h3>
                      {office.contactName && (
                        <p className="text-sm text-gray-600">Contact: {office.contactName}</p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditOffice(office)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-2 text-sm text-gray-600">
                    {office.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        <span>{office.email}</span>
                      </div>
                    )}
                    {office.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        <span>{office.phone}</span>
                      </div>
                    )}
                    {office.address && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span className="line-clamp-2">{office.address}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <ClientModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        client={selectedClient}
        onSuccess={handleModalSuccess}
      />

      <OfficeModal
        isOpen={isOfficeModalOpen}
        onClose={() => setIsOfficeModalOpen(false)}
        office={selectedOffice}
        onSuccess={handleOfficeModalSuccess}
      />

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={closeConfirmDialog}
        onConfirm={handleConfirm}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmText={confirmDialog.confirmText}
        variant={confirmDialog.variant}
        isLoading={isDeleting}
      />
    </>
  );
});

ClientsContent.displayName = 'ClientsContent';

const Clients = memo(() => {
  return (
    <Layout title="Clients">
      <AsyncBoundary>
        <ClientsContent />
      </AsyncBoundary>
    </Layout>
  );
});

Clients.displayName = 'Clients';

export default Clients;