import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { OfficeModal } from '@/components/modals/office-modal';
import { officeApi } from '@/lib/api';
import { Office } from '@shared/schema';
import { Building2, Plus, Search, Mail, Phone, Globe, MapPin, Users, Edit, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export const Offices = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOfficeModalOpen, setIsOfficeModalOpen] = useState(false);
  const [selectedOffice, setSelectedOffice] = useState<Office | undefined>();

  const { data: offices = [], isLoading } = useQuery({
    queryKey: ['offices'],
    queryFn: officeApi.getAll,
  });

  const filteredOffices = offices.filter((office: Office) =>
    office.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    office.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    office.contactName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEditOffice = (office: Office) => {
    setSelectedOffice(office);
    setIsOfficeModalOpen(true);
  };

  const handleAddOffice = () => {
    setSelectedOffice(undefined);
    setIsOfficeModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsOfficeModalOpen(false);
    setSelectedOffice(undefined);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading offices...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Office Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your agency offices and locations
          </p>
        </div>
        <Button onClick={handleAddOffice} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Office
        </Button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search offices..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Building2 className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Offices</p>
                <p className="text-2xl font-semibold">{offices.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Active Locations</p>
                <p className="text-2xl font-semibold">{offices.filter(o => o.email).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Globe className="w-8 h-8 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">With Websites</p>
                <p className="text-2xl font-semibold">{offices.filter(o => o.website).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Offices Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredOffices.map((office: Office) => (
          <Card key={office.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{office.name}</CardTitle>
                    {office.contactName && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {office.contactName}
                      </p>
                    )}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <span className="sr-only">Open menu</span>
                      <div className="flex flex-col gap-0.5">
                        <div className="w-1 h-1 bg-gray-400 rounded-full" />
                        <div className="w-1 h-1 bg-gray-400 rounded-full" />
                        <div className="w-1 h-1 bg-gray-400 rounded-full" />
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEditOffice(office)}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Office
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-red-600">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Office
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {office.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600 dark:text-gray-400">{office.email}</span>
                </div>
              )}
              
              {office.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600 dark:text-gray-400">{office.phone}</span>
                </div>
              )}
              
              {office.address && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600 dark:text-gray-400 line-clamp-2">
                    {office.address}
                  </span>
                </div>
              )}
              
              {office.website && (
                <div className="flex items-center gap-2 text-sm">
                  <Globe className="w-4 h-4 text-gray-400" />
                  <a 
                    href={office.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {office.website}
                  </a>
                </div>
              )}

              {office.notes && (
                <div className="pt-2 border-t">
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                    {office.notes}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredOffices.length === 0 && (
        <div className="text-center py-12">
          <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No offices found
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {searchTerm ? 'Try adjusting your search criteria' : 'Get started by adding your first office'}
          </p>
          {!searchTerm && (
            <Button onClick={handleAddOffice} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Office
            </Button>
          )}
        </div>
      )}

      {/* Office Modal */}
      <OfficeModal
        isOpen={isOfficeModalOpen}
        onClose={handleCloseModal}
        office={selectedOffice}
      />
    </div>
  );
};