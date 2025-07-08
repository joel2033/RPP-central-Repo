import React, { memo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, Phone, MapPin, Edit, Trash2, Eye } from 'lucide-react';
import { formatDate, formatPhoneNumber } from '@/utils/formatting';
import { useLocation } from 'wouter';
import type { Client } from '@shared/schema';

interface ClientCardProps {
  client: Client;
  onEdit: (client: Client) => void;
  onDelete: (client: Client) => void;
}

export const ClientCard = memo(({ client, onEdit, onDelete }: ClientCardProps) => {
  const [_, navigate] = useLocation();
  
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
          <CardTitle className="text-lg">{client.name}</CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleViewProfile}
              className="gap-1"
            >
              <Eye className="h-3 w-3" />
              View
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleEdit}
              className="gap-1"
            >
              <Edit className="h-3 w-3" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-3 w-3" />
              Delete
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Mail className="h-4 w-4 flex-shrink-0" />
          <span className="truncate">{client.email || "No email"}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Phone className="h-4 w-4 flex-shrink-0" />
          <span>{client.phone ? formatPhoneNumber(client.phone) : "No phone"}</span>
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