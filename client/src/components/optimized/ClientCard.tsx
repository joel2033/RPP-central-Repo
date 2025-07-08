import React, { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, Phone, MapPin } from 'lucide-react';
import { formatDate, formatPhoneNumber } from '@/utils/formatting';
import type { Client } from '@shared/schema';

interface ClientCardProps {
  client: Client;
  onEdit: (client: Client) => void;
  onDelete: (clientId: number) => void;
}

const ClientCard = memo(({ client, onEdit, onDelete }: ClientCardProps) => {
  const handleEdit = () => onEdit(client);
  const handleDelete = () => onDelete(client.id);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{client.name}</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleEdit}>
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
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
  );
});

ClientCard.displayName = 'ClientCard';

export default ClientCard;