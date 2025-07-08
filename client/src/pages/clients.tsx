import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useFilters } from "@/hooks/useFilters";
import Sidebar from "@/components/layout/sidebar";
import TopBar from "@/components/layout/topbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Users, Phone, Mail, MapPin } from "lucide-react";
import { SearchAndFilter } from "@/components/common/SearchAndFilter";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import ClientModal from "@/components/modals/client-modal";
import { formatDate, formatPhoneNumber } from "@/utils/formatting";
import { API_ENDPOINTS } from "@/utils/constants";
import type { Client } from "@shared/schema";

const statusOptions = [
  { value: 'all', label: 'All Clients' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

export default function Clients() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, authLoading, toast]);

  const { data: clients, isLoading } = useQuery<Client[]>({
    queryKey: [API_ENDPOINTS.CLIENTS],
    enabled: isAuthenticated,
  });

  // Client filtering logic
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

  const deleteClientMutation = useMutation({
    mutationFn: async (clientId: number) => {
      await apiRequest("DELETE", `${API_ENDPOINTS.CLIENTS}/${clientId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.CLIENTS] });
      toast({
        title: "Success",
        description: "Client deleted successfully",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to delete client",
        variant: "destructive",
      });
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

  const handleDeleteClient = useCallback((clientId: number) => {
    if (window.confirm("Are you sure you want to delete this client?")) {
      deleteClientMutation.mutate(clientId);
    }
  }, [deleteClientMutation]);

  if (authLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 ml-64">
        <TopBar title="Clients" />
        
        <div className="p-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
              <p className="text-gray-600">Manage your client relationships</p>
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

          {isLoading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : filteredClients.length === 0 ? (
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
                <Card key={client.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{client.name}</CardTitle>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditClient(client)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteClient(client.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="h-4 w-4" />
                      {client.email || "No email"}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="h-4 w-4" />
                      {client.phone ? formatPhoneNumber(client.phone) : "No phone"}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="h-4 w-4" />
                      {client.address || "No address"}
                    </div>
                    {client.contactName && (
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Contact:</span> {client.contactName}
                      </div>
                    )}
                    <div className="text-xs text-gray-500">
                      Added {formatDate(client.createdAt)}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <ClientModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        client={selectedClient}
        onSuccess={() => {
          setIsModalOpen(false);
          setSelectedClient(null);
          queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.CLIENTS] });
        }}
      />
    </div>
  );
}