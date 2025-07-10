
import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Edit2, Trash2, Save, Eye, History, DollarSign } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ServiceOption {
  id: string;
  name: string;
  price: number;
  currency: string;
  isActive: boolean;
  description?: string;
}

interface ServiceCategory {
  category: string;
  categoryId: string;
  isActive: boolean;
  options: ServiceOption[];
}

interface EditorServicesManagerProps {
  editorId: string;
  isAdmin?: boolean;
  readOnly?: boolean;
}

export default function EditorServicesManager({ 
  editorId, 
  isAdmin = false, 
  readOnly = false 
}: EditorServicesManagerProps) {
  const [services, setServices] = useState<ServiceCategory[]>([]);
  const [currency, setCurrency] = useState("AUD");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingOption, setEditingOption] = useState<{ categoryId: string; optionId: string } | null>(null);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showChangeLog, setShowChangeLog] = useState(false);

  const queryClient = useQueryClient();

  // Fetch editor services
  const { data: editorServices, isLoading } = useQuery({
    queryKey: [`/api/editor-services/${editorId}`],
    enabled: !!editorId,
  });

  // Fetch service templates
  const { data: serviceTemplates } = useQuery({
    queryKey: ["/api/service-templates"],
    enabled: isAdmin,
  });

  // Fetch change logs
  const { data: changeLogs } = useQuery({
    queryKey: [`/api/service-change-logs/${editorId}`],
    enabled: showChangeLog && (isAdmin || !readOnly),
  });

  // Save services mutation
  const saveServicesMutation = useMutation({
    mutationFn: async (data: { services: ServiceCategory[]; currency: string }) => {
      const response = await fetch("/api/editor-services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          editorId,
          services: data.services,
          currency: data.currency,
        }),
      });
      if (!response.ok) throw new Error("Failed to save services");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/editor-services/${editorId}`] });
      toast({ title: "Services saved successfully" });
    },
    onError: () => {
      toast({ title: "Failed to save services", variant: "destructive" });
    },
  });

  // Initialize services from API data
  useEffect(() => {
    if (editorServices) {
      setServices(editorServices.services || []);
      setCurrency(editorServices.currency || "AUD");
    }
  }, [editorServices]);

  const generateId = () => Math.random().toString(36).substring(2, 9);

  const addCategory = () => {
    if (!newCategoryName.trim()) return;
    
    const newCategory: ServiceCategory = {
      category: newCategoryName,
      categoryId: generateId(),
      isActive: true,
      options: [],
    };
    
    setServices([...services, newCategory]);
    setNewCategoryName("");
  };

  const updateCategory = (categoryId: string, updates: Partial<ServiceCategory>) => {
    setServices(services.map(cat => 
      cat.categoryId === categoryId ? { ...cat, ...updates } : cat
    ));
  };

  const deleteCategory = (categoryId: string) => {
    setServices(services.filter(cat => cat.categoryId !== categoryId));
  };

  const addOption = (categoryId: string) => {
    const newOption: ServiceOption = {
      id: generateId(),
      name: "New Service",
      price: 0,
      currency,
      isActive: true,
      description: "",
    };
    
    updateCategory(categoryId, {
      options: [...(services.find(cat => cat.categoryId === categoryId)?.options || []), newOption]
    });
  };

  const updateOption = (categoryId: string, optionId: string, updates: Partial<ServiceOption>) => {
    const category = services.find(cat => cat.categoryId === categoryId);
    if (!category) return;
    
    const updatedOptions = category.options.map(opt =>
      opt.id === optionId ? { ...opt, ...updates } : opt
    );
    
    updateCategory(categoryId, { options: updatedOptions });
  };

  const deleteOption = (categoryId: string, optionId: string) => {
    const category = services.find(cat => cat.categoryId === categoryId);
    if (!category) return;
    
    const updatedOptions = category.options.filter(opt => opt.id !== optionId);
    updateCategory(categoryId, { options: updatedOptions });
  };

  const applyTemplate = (template: any) => {
    setServices(template.services);
    setCurrency(template.currency);
    setShowTemplateDialog(false);
    toast({ title: "Template applied successfully" });
  };

  const saveServices = () => {
    saveServicesMutation.mutate({ services, currency });
  };

  if (isLoading) {
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Service Pricing Management</h2>
          <p className="text-gray-600">Configure custom services and pricing for this editor</p>
        </div>
        <div className="flex items-center space-x-2">
          {!readOnly && (
            <>
              {isAdmin && (
                <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Apply Template
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Apply Service Template</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      {serviceTemplates?.map((template: any) => (
                        <Card key={template.id} className="cursor-pointer hover:bg-gray-50" onClick={() => applyTemplate(template)}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className="font-medium">{template.name}</h3>
                                <p className="text-sm text-gray-600">{template.description}</p>
                                {template.isDefault && (
                                  <Badge variant="secondary" className="mt-1">Default</Badge>
                                )}
                              </div>
                              <div className="text-right">
                                <div className="text-sm text-gray-600">
                                  {template.services.length} categories
                                </div>
                                <div className="text-sm font-medium">{template.currency}</div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </DialogContent>
                </Dialog>
              )}
              
              <Dialog open={showChangeLog} onOpenChange={setShowChangeLog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <History className="h-4 w-4 mr-2" />
                    Change Log
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-96 overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Service Change History</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    {changeLogs?.map((log: any) => (
                      <Card key={log.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant={log.changeType === 'create' ? 'default' : log.changeType === 'delete' ? 'destructive' : 'secondary'}>
                              {log.changeType}
                            </Badge>
                            <span className="text-sm text-gray-600">
                              {new Date(log.createdAt).toLocaleString()}
                            </span>
                          </div>
                          {log.serviceCategory && (
                            <p className="text-sm"><strong>Category:</strong> {log.serviceCategory}</p>
                          )}
                          {log.serviceName && (
                            <p className="text-sm"><strong>Service:</strong> {log.serviceName}</p>
                          )}
                          {log.reason && (
                            <p className="text-sm text-gray-600">{log.reason}</p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
              
              <Button onClick={saveServices} disabled={saveServicesMutation.isPending}>
                <Save className="h-4 w-4 mr-2" />
                {saveServicesMutation.isPending ? "Saving..." : "Save Services"}
              </Button>
            </>
          )}
          
          {readOnly && (
            <Badge variant="secondary">
              <Eye className="h-4 w-4 mr-1" />
              View Only
            </Badge>
          )}
        </div>
      </div>

      {/* Currency Selection */}
      {!readOnly && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Currency Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <Label htmlFor="currency">Default Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AUD">AUD</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                  <SelectItem value="CAD">CAD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add New Category */}
      {!readOnly && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Add Service Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <Input
                placeholder="Category name (e.g., Image Enhancement)"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addCategory()}
              />
              <Button onClick={addCategory} disabled={!newCategoryName.trim()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Category
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Services Accordion */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Service Categories</CardTitle>
        </CardHeader>
        <CardContent>
          {services.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No services configured yet. Add your first category above.
            </div>
          ) : (
            <Accordion type="multiple" className="space-y-4">
              {services.map((category) => (
                <AccordionItem key={category.categoryId} value={category.categoryId} className="border rounded-lg">
                  <AccordionTrigger className="px-4 hover:no-underline">
                    <div className="flex items-center justify-between w-full mr-4">
                      <div className="flex items-center space-x-3">
                        <h3 className="font-medium">{category.category}</h3>
                        <Badge variant={category.isActive ? "default" : "secondary"}>
                          {category.isActive ? "Active" : "Inactive"}
                        </Badge>
                        <Badge variant="outline">
                          {category.options.length} services
                        </Badge>
                      </div>
                      {!readOnly && (
                        <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                          <Switch
                            checked={category.isActive}
                            onCheckedChange={(checked) => updateCategory(category.categoryId, { isActive: checked })}
                          />
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Category</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{category.category}"? This will remove all services in this category.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteCategory(category.categoryId)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <div className="space-y-4">
                      {/* Category Name Edit */}
                      {!readOnly && editingCategory === category.categoryId && (
                        <div className="flex items-center space-x-2">
                          <Input
                            value={category.category}
                            onChange={(e) => updateCategory(category.categoryId, { category: e.target.value })}
                            onBlur={() => setEditingCategory(null)}
                            onKeyPress={(e) => e.key === 'Enter' && setEditingCategory(null)}
                            autoFocus
                          />
                        </div>
                      )}
                      
                      {/* Service Options */}
                      <div className="space-y-3">
                        {category.options.map((option) => (
                          <div key={option.id} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                            <div className="flex-1">
                              {editingOption?.categoryId === category.categoryId && editingOption?.optionId === option.id && !readOnly ? (
                                <div className="space-y-2">
                                  <Input
                                    value={option.name}
                                    onChange={(e) => updateOption(category.categoryId, option.id, { name: e.target.value })}
                                    placeholder="Service name"
                                  />
                                  <div className="flex items-center space-x-2">
                                    <DollarSign className="h-4 w-4" />
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={option.price}
                                      onChange={(e) => updateOption(category.categoryId, option.id, { price: parseFloat(e.target.value) || 0 })}
                                      placeholder="Price"
                                      className="w-24"
                                    />
                                    <span className="text-sm text-gray-600">{option.currency}</span>
                                  </div>
                                  <Textarea
                                    value={option.description || ""}
                                    onChange={(e) => updateOption(category.categoryId, option.id, { description: e.target.value })}
                                    placeholder="Service description (optional)"
                                    rows={2}
                                  />
                                  <div className="flex items-center space-x-2">
                                    <Button size="sm" onClick={() => setEditingOption(null)}>
                                      Done
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div>
                                  <div className="flex items-center space-x-3">
                                    <span className="font-medium">{option.name}</span>
                                    <Badge variant={option.isActive ? "default" : "secondary"}>
                                      {option.isActive ? "Active" : "Inactive"}
                                    </Badge>
                                    <span className="text-lg font-bold text-green-600">
                                      {option.currency} ${option.price.toFixed(2)}
                                    </span>
                                  </div>
                                  {option.description && (
                                    <p className="text-sm text-gray-600 mt-1">{option.description}</p>
                                  )}
                                </div>
                              )}
                            </div>
                            
                            {!readOnly && (
                              <div className="flex items-center space-x-2 ml-4">
                                <Switch
                                  checked={option.isActive}
                                  onCheckedChange={(checked) => updateOption(category.categoryId, option.id, { isActive: checked })}
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingOption({ categoryId: category.categoryId, optionId: option.id })}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Service</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete "{option.name}"?
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => deleteOption(category.categoryId, option.id)}>
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            )}
                          </div>
                        ))}
                        
                        {!readOnly && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => addOption(category.categoryId)}
                            className="w-full"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Service Option
                          </Button>
                        )}
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
