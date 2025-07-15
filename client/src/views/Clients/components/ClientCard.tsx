import React, { memo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Mail, Phone, MapPin, Edit, Trash2, Eye, MoreVertical, Building2 } from 'lucide-react';
import { formatDate, formatAustralianPhoneNumber } from '@/utils/formatting';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { officeApi } from '@/lib/api';
import type { Client } from '@shared/schema';

interface ClientCardProps {
  client: Client;
  onEdit: (client: Client) => void;
  onDelete: (client: Client) => void;
}

export const ClientCard = memo(({ client, onEdit, onDelete }: ClientCardProps) => {
  const [_, navigate] = useLocation();
  
  // Fetch office information if client has an officeId
  const { data: office } = useQuery({
    queryKey: ['office', client.officeId],
    queryFn: () => officeApi.getById(client.officeId!),
    enabled: !!client.officeId,
  });
  
  const handleEdit = useCallback(() => {
    onEdit(client);
  }, [client, onEdit]);

  const handleDelete = useCallback(() => {
    onDelete(client);
  }, [client, onDelete]);

  const handleViewProfile = useCallback(() => {
    navigate(`/clients/${client.id}`);
  }, [client.id, navigate]);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle 
            className="text-lg cursor-pointer hover:text-blue-600 transition-colors"
            onClick={handleViewProfile}
          >
            {client.name}
          </CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleViewProfile}>
                <Eye className="h-4 w-4 mr-2" />
                View Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Client
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={handleDelete}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Client
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {office && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Building2 className="h-4 w-4 flex-shrink-0" />
            <span className="font-medium truncate">{office.name}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Mail className="h-4 w-4 flex-shrink-0" />
          <span className="truncate">{client.email || "No email"}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Phone className="h-4 w-4 flex-shrink-0" />
          <span>{client.phone ? formatAustralianPhoneNumber(client.phone) : "No phone"}</span>
        </div>
        <div className="flex items-start gap-2 text-sm text-gray-600">
          <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span className="line-clamp-2">{client.address || "No address"}</span>
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
  );
});

ClientCard.displayName = 'ClientCard';