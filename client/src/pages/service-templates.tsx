
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Edit2, Trash2, Save, Template, DollarSign } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface ServiceOption {
  id: string;
  name: string;
  price: number;
  currency: string;
  description?: string;
}

interface ServiceCategory {
  category: string;
  categoryId: string;
  options: ServiceOption[];
}

interface ServiceTemplate {
  id?: number;
  name: string;
  description: string;
  services: ServiceCategory[];
  currency: string;
  isDefault: boolean;
}

export default function ServiceTemplatesPage() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ServiceTemplate | null>(null);
  const [newTemplate, setNewTemplate] = useState<ServiceTemplate>({
    name: "",
    description: "",
    services: [],
    currency: "AUD",
    isDefault: false,
  });

  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch service templates
  const { data: templates, isLoading } = useQuery({
    queryKey: ["/api/service-templates"],
  });

  // Create template mutation
  const createTemplateMutation = useMutation({
    mutationFn: async (template: ServiceTemplate) => {
      const response = await fetch("/api/service-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(template),
      });
      if (!response.ok) throw new Error("Failed to create template");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-templates"] });
      toast({ title: "Template created successfully" });
      setShowCreateDialog(false);
      resetNewTemplate();
    },
    onError: () => {
      toast({ title: "Failed to create template", variant: "destructive" });
    },
  });

  // Update template mutation
  const updateTemplateMutation = useMutation({
    mutationFn: async (template: ServiceTemplate) => {
      const response = await fetch(`/api/service-templates/${template.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(template),
      });
      if (!response.ok) throw new Error("Failed to update template");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-templates"] });
      toast({ title: "Template updated successfully" });
      setEditingTemplate(null);
    },
    onError: () => {
      toast({ title: "Failed to update template", variant: "destructive" });
    },
  });

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/service-templates/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete template");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-templates"] });
      toast({ title: "Template deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete template", variant: "destructive" });
    },
  });

  const resetNewTemplate = () => {
    setNewTemplate({
      name: "",
      description: "",
      services: [],
      currency: "AUD",
      isDefault: false,
    });
  };

  const generateId = () => Math.random().toString(36).substring(2, 9);

  const addCategoryToTemplate = (template: ServiceTemplate, setTemplate: (t: ServiceTemplate) => void) => {
    const newCategory: ServiceCategory = {
      category: "New Category",
      categoryId: generateId(),
      options: [],
    };
    
    setTemplate({
      ...template,
      services: [...template.services, newCategory],
    });
  };

  const updateCategoryInTemplate = (
    template: ServiceTemplate,
    setTemplate: (t: ServiceTemplate) => void,
    categoryId: string,
    updates: Partial<ServiceCategory>
  ) => {
    setTemplate({
      ...template,
      services: template.services.map(cat =>
        cat.categoryId === categoryId ? { ...cat, ...updates } : cat
      ),
    });
  };

  const deleteCategoryFromTemplate = (
    template: ServiceTemplate,
    setTemplate: (t: ServiceTemplate) => void,
    categoryId: string
  ) => {
    setTemplate({
      ...template,
      services: template.services.filter(cat => cat.categoryId !== categoryId),
    });
  };

  const addOptionToCategory = (
    template: ServiceTemplate,
    setTemplate: (t: ServiceTemplate) => void,
    categoryId: string
  ) => {
    const newOption: ServiceOption = {
      id: generateId(),
      name: "New Service",
      price: 0,
      currency: template.currency,
      description: "",
    };
    
    updateCategoryInTemplate(template, setTemplate, categoryId, {
      options: [
        ...(template.services.find(cat => cat.categoryId === categoryId)?.options || []),
        newOption
      ]
    });
  };

  const updateOptionInCategory = (
    template: ServiceTemplate,
    setTemplate: (t: ServiceTemplate) => void,
    categoryId: string,
    optionId: string,
    updates: Partial<ServiceOption>
  ) => {
    const category = template.services.find(cat => cat.categoryId === categoryId);
    if (!category) return;
    
    const updatedOptions = category.options.map(opt =>
      opt.id === optionId ? { ...opt, ...updates } : opt
    );
    
    updateCategoryInTemplate(template, setTemplate, categoryId, { options: updatedOptions });
  };

  const deleteOptionFromCategory = (
    template: ServiceTemplate,
    setTemplate: (t: ServiceTemplate) => void,
    categoryId: string,
    optionId: string
  ) => {
    const category = template.services.find(cat => cat.categoryId === categoryId);
    if (!category) return;
    
    const updatedOptions = category.options.filter(opt => opt.id !== optionId);
    updateCategoryInTemplate(template, setTemplate, categoryId, { options: updatedOptions });
  };

  const renderTemplateForm = (
    template: ServiceTemplate,
    setTemplate: (t: ServiceTemplate) => void,
    onSave: () => void,
    onCancel: () => void
  ) => (
    <div className="space-y-6">
      {/* Basic Info */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Template Name</Label>
          <Input
            id="name"
            value={template.name}
            onChange={(e) => setTemplate({ ...template, name: e.target.value })}
            placeholder="e.g., Real Estate Standard"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="currency">Currency</Label>
          <Select value={template.currency} onValueChange={(value) => setTemplate({ ...template, currency: value })}>
            <SelectTrigger>
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
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={template.description}
          onChange={(e) => setTemplate({ ...template, description: e.target.value })}
          placeholder="Describe this template..."
        />
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          checked={template.isDefault}
          onCheckedChange={(checked) => setTemplate({ ...template, isDefault: checked })}
        />
        <Label>Set as default template</Label>
      </div>

      {/* Service Categories */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Service Categories</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => addCategoryToTemplate(template, setTemplate)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Category
          </Button>
        </div>

        <div className="space-y-4">
          {template.services.map((category) => (
            <Card key={category.categoryId} className="border-l-4 border-l-blue-500">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Input
                    value={category.category}
                    onChange={(e) => updateCategoryInTemplate(template, setTemplate, category.categoryId, { category: e.target.value })}
                    className="font-medium"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteCategoryFromTemplate(template, setTemplate, category.categoryId)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {category.options.map((option) => (
                  <div key={option.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                    <Input
                      value={option.name}
                      onChange={(e) => updateOptionInCategory(template, setTemplate, category.categoryId, option.id, { name: e.target.value })}
                      placeholder="Service name"
                      className="flex-1"
                    />
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-4 w-4" />
                      <Input
                        type="number"
                        step="0.01"
                        value={option.price}
                        onChange={(e) => updateOptionInCategory(template, setTemplate, category.categoryId, option.id, { price: parseFloat(e.target.value) || 0 })}
                        placeholder="Price"
                        className="w-24"
                      />
                    </div>
                    <Input
                      value={option.description || ""}
                      onChange={(e) => updateOptionInCategory(template, setTemplate, category.categoryId, option.id, { description: e.target.value })}
                      placeholder="Description (optional)"
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteOptionFromCategory(template, setTemplate, category.categoryId, option.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addOptionToCategory(template, setTemplate, category.categoryId)}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Service Option
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={onSave}>
          <Save className="h-4 w-4 mr-2" />
          Save Template
        </Button>
      </div>
    </div>
  );

  if (user?.role !== 'admin') {
    return (
      <Layout>
        <div className="text-center py-8">
          <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
          <p className="text-gray-600 mt-2">Only administrators can manage service templates.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Service Templates</h1>
            <p className="text-gray-600">Manage reusable service templates for editors</p>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Service Template</DialogTitle>
              </DialogHeader>
              {renderTemplateForm(
                newTemplate,
                setNewTemplate,
                () => createTemplateMutation.mutate(newTemplate),
                () => {
                  setShowCreateDialog(false);
                  resetNewTemplate();
                }
              )}
            </DialogContent>
          </Dialog>
        </div>

        {/* Templates List */}
        <div className="grid grid-cols-1 gap-6">
          {isLoading ? (
            <div className="text-center py-8">Loading templates...</div>
          ) : templates?.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Template className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No templates yet</h3>
                <p className="text-gray-600 mb-4">Create your first service template to get started.</p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Template
                </Button>
              </CardContent>
            </Card>
          ) : (
            templates?.map((template: any) => (
              <Card key={template.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Template className="h-6 w-6 text-brand-blue" />
                      <div>
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        <p className="text-sm text-gray-600">{template.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {template.isDefault && (
                        <Badge variant="default">Default</Badge>
                      )}
                      <Badge variant="outline">{template.currency}</Badge>
                      <Badge variant="secondary">
                        {template.services.length} categories
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingTemplate(template)}
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
                            <AlertDialogTitle>Delete Template</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{template.name}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteTemplateMutation.mutate(template.id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {template.services.map((category: any) => (
                      <div key={category.categoryId} className="border-l-4 border-l-gray-300 pl-4">
                        <h4 className="font-medium text-gray-900">{category.category}</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                          {category.options.map((option: any) => (
                            <div key={option.id} className="text-sm text-gray-600 flex items-center justify-between">
                              <span>{option.name}</span>
                              <span className="font-medium">
                                {template.currency} ${option.price.toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Edit Dialog */}
        {editingTemplate && (
          <Dialog open={!!editingTemplate} onOpenChange={(open) => !open && setEditingTemplate(null)}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Service Template</DialogTitle>
              </DialogHeader>
              {renderTemplateForm(
                editingTemplate,
                setEditingTemplate,
                () => updateTemplateMutation.mutate(editingTemplate),
                () => setEditingTemplate(null)
              )}
            </DialogContent>
          </Dialog>
        )}
      </div>
    </Layout>
  );
}
