import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Plus, Edit2, Trash2, DollarSign, Settings, Package } from "lucide-react";
import { editorServiceApi } from "@/lib/api/editorServiceApi";
import type { EditorServiceCategory, EditorServiceOption } from "@shared/schema";

interface ServiceStructure extends EditorServiceCategory {
  options: EditorServiceOption[];
}

export default function EditorServicePricing() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [selectedCategory, setSelectedCategory] = useState<ServiceStructure | null>(null);
  const [selectedOption, setSelectedOption] = useState<EditorServiceOption | null>(null);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [isAddingOption, setIsAddingOption] = useState(false);
  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const [isEditingOption, setIsEditingOption] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  const [categoryForm, setCategoryForm] = useState({
    categoryName: "",
    isActive: true,
    displayOrder: 0,
  });

  const [optionForm, setOptionForm] = useState({
    optionName: "",
    price: "",
    currency: "AUD",
    isActive: true,
    displayOrder: 0,
  });

  // Fetch editor's service structure
  const { data: serviceStructure, isLoading, error } = useQuery({
    queryKey: ["editor-services", user?.id],
    queryFn: () => editorServiceApi.getEditorServices(user?.id || ""),
    enabled: !!user?.id,
  });

  // Fetch service templates
  const { data: serviceTemplates } = useQuery({
    queryKey: ["service-templates"],
    queryFn: () => editorServiceApi.getServiceTemplates(),
    enabled: showTemplates,
  });

  // Create category mutation
  const createCategoryMutation = useMutation({
    mutationFn: (data: typeof categoryForm) => editorServiceApi.createCategory(user?.id || "", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["editor-services", user?.id] });
      setCategoryForm({ categoryName: "", isActive: true, displayOrder: 0 });
      setIsAddingCategory(false);
      toast({ title: "Service category created successfully" });
    },
    onError: (error) => {
      toast({ title: "Failed to create category", description: error.message, variant: "destructive" });
    },
  });

  // Create option mutation
  const createOptionMutation = useMutation({
    mutationFn: (data: typeof optionForm & { categoryId: number }) => 
      editorServiceApi.createOption(data.categoryId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["editor-services", user?.id] });
      setOptionForm({ optionName: "", price: "", currency: "AUD", isActive: true, displayOrder: 0 });
      setIsAddingOption(false);
      toast({ title: "Service option created successfully" });
    },
    onError: (error) => {
      toast({ title: "Failed to create option", description: error.message, variant: "destructive" });
    },
  });

  // Update category mutation
  const updateCategoryMutation = useMutation({
    mutationFn: (data: { id: number; updates: Partial<EditorServiceCategory> }) => 
      editorServiceApi.updateCategory(data.id, data.updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["editor-services", user?.id] });
      setIsEditingCategory(false);
      setSelectedCategory(null);
      toast({ title: "Service category updated successfully" });
    },
    onError: (error) => {
      toast({ title: "Failed to update category", description: error.message, variant: "destructive" });
    },
  });

  // Update option mutation
  const updateOptionMutation = useMutation({
    mutationFn: (data: { id: number; updates: Partial<EditorServiceOption> }) => 
      editorServiceApi.updateOption(data.id, data.updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["editor-services", user?.id] });
      setIsEditingOption(false);
      setSelectedOption(null);
      toast({ title: "Service option updated successfully" });
    },
    onError: (error) => {
      toast({ title: "Failed to update option", description: error.message, variant: "destructive" });
    },
  });

  // Delete category mutation
  const deleteCategoryMutation = useMutation({
    mutationFn: (categoryId: number) => editorServiceApi.deleteCategory(categoryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["editor-services", user?.id] });
      toast({ title: "Service category deleted successfully" });
    },
    onError: (error) => {
      toast({ title: "Failed to delete category", description: error.message, variant: "destructive" });
    },
  });

  // Delete option mutation
  const deleteOptionMutation = useMutation({
    mutationFn: (optionId: number) => editorServiceApi.deleteOption(optionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["editor-services", user?.id] });
      toast({ title: "Service option deleted successfully" });
    },
    onError: (error) => {
      toast({ title: "Failed to delete option", description: error.message, variant: "destructive" });
    },
  });

  // Apply template mutation
  const applyTemplateMutation = useMutation({
    mutationFn: (templateId: number) => editorServiceApi.applyTemplateToEditor(templateId, user?.id || ""),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["editor-services", user?.id] });
      toast({ title: "Service template applied successfully" });
    },
    onError: (error) => {
      toast({ title: "Failed to apply template", description: error.message, variant: "destructive" });
    },
  });

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    createCategoryMutation.mutate(categoryForm);
  };

  const handleCreateOption = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCategory) {
      createOptionMutation.mutate({ ...optionForm, categoryId: selectedCategory.id });
    }
  };

  const handleUpdateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCategory) {
      updateCategoryMutation.mutate({ id: selectedCategory.id, updates: categoryForm });
    }
  };

  const handleUpdateOption = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedOption) {
      updateOptionMutation.mutate({ id: selectedOption.id, updates: optionForm });
    }
  };

  const openEditCategory = (category: ServiceStructure) => {
    setSelectedCategory(category);
    setCategoryForm({
      categoryName: category.categoryName,
      isActive: category.isActive,
      displayOrder: category.displayOrder,
    });
    setIsEditingCategory(true);
  };

  const openEditOption = (option: EditorServiceOption) => {
    setSelectedOption(option);
    setOptionForm({
      optionName: option.optionName,
      price: option.price,
      currency: option.currency,
      isActive: option.isActive,
      displayOrder: option.displayOrder,
    });
    setIsEditingOption(true);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>My Service Pricing</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Loading your services...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>My Service Pricing</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-red-500">
            Failed to load services. Please try again.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              My Service Pricing
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              Manage your custom service categories and pricing options
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowTemplates(!showTemplates)}
              size="sm"
            >
              <Package className="h-4 w-4 mr-2" />
              Templates
            </Button>
            <Button
              onClick={() => setIsAddingCategory(true)}
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Service Categories */}
        {serviceStructure && serviceStructure.length > 0 ? (
          <div className="space-y-4">
            {serviceStructure.map((category) => (
              <div key={category.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-lg">{category.categoryName}</h3>
                    <Badge variant={category.isActive ? "default" : "secondary"}>
                      {category.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedCategory(category);
                        setIsAddingOption(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Option
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditCategory(category)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteCategoryMutation.mutate(category.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                {/* Service Options */}
                <div className="space-y-2 ml-4">
                  {category.options.map((option) => (
                    <div key={option.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                      <div>
                        <span className="font-medium">{option.optionName}</span>
                        <span className="text-gray-600 ml-2">
                          {option.currency} ${option.price}
                        </span>
                        <Badge 
                          variant={option.isActive ? "default" : "secondary"}
                          className="ml-2"
                        >
                          {option.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditOption(option)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteOptionMutation.mutate(option.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {category.options.length === 0 && (
                    <p className="text-gray-500 text-sm">No options yet. Add your first option above.</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Settings className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg text-gray-500 mb-2">No service categories yet</p>
            <p className="text-gray-400 mb-4">Create your first service category to get started</p>
            <Button onClick={() => setIsAddingCategory(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Category
            </Button>
          </div>
        )}

        {/* Service Templates */}
        {showTemplates && serviceTemplates && (
          <div className="mt-6 pt-6 border-t">
            <h3 className="font-semibold mb-4">Service Templates</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {serviceTemplates.map((template) => (
                <div key={template.id} className="border rounded-lg p-4">
                  <h4 className="font-medium">{template.templateName}</h4>
                  <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => applyTemplateMutation.mutate(template.id)}
                    disabled={applyTemplateMutation.isPending}
                  >
                    {applyTemplateMutation.isPending ? "Applying..." : "Apply Template"}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add Category Dialog */}
        <Dialog open={isAddingCategory} onOpenChange={setIsAddingCategory}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Service Category</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div>
                <Label htmlFor="categoryName">Category Name</Label>
                <Input
                  id="categoryName"
                  value={categoryForm.categoryName}
                  onChange={(e) => setCategoryForm({ ...categoryForm, categoryName: e.target.value })}
                  placeholder="e.g., Floor Plan, Image Enhancement"
                  required
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={categoryForm.isActive}
                  onCheckedChange={(checked) => setCategoryForm({ ...categoryForm, isActive: checked })}
                />
                <Label htmlFor="isActive">Active</Label>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setIsAddingCategory(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createCategoryMutation.isPending}>
                  {createCategoryMutation.isPending ? "Creating..." : "Create Category"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Add Option Dialog */}
        <Dialog open={isAddingOption} onOpenChange={setIsAddingOption}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Service Option</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateOption} className="space-y-4">
              <div>
                <Label htmlFor="optionName">Option Name</Label>
                <Input
                  id="optionName"
                  value={optionForm.optionName}
                  onChange={(e) => setOptionForm({ ...optionForm, optionName: e.target.value })}
                  placeholder="e.g., 2D - Under 350sqm, Day Enhancement"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price">Price</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={optionForm.price}
                    onChange={(e) => setOptionForm({ ...optionForm, price: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="currency">Currency</Label>
                  <Select value={optionForm.currency} onValueChange={(value) => setOptionForm({ ...optionForm, currency: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AUD">AUD</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="optionIsActive"
                  checked={optionForm.isActive}
                  onCheckedChange={(checked) => setOptionForm({ ...optionForm, isActive: checked })}
                />
                <Label htmlFor="optionIsActive">Active</Label>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setIsAddingOption(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createOptionMutation.isPending}>
                  {createOptionMutation.isPending ? "Creating..." : "Create Option"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Category Dialog */}
        <Dialog open={isEditingCategory} onOpenChange={setIsEditingCategory}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Service Category</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdateCategory} className="space-y-4">
              <div>
                <Label htmlFor="editCategoryName">Category Name</Label>
                <Input
                  id="editCategoryName"
                  value={categoryForm.categoryName}
                  onChange={(e) => setCategoryForm({ ...categoryForm, categoryName: e.target.value })}
                  required
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="editCategoryIsActive"
                  checked={categoryForm.isActive}
                  onCheckedChange={(checked) => setCategoryForm({ ...categoryForm, isActive: checked })}
                />
                <Label htmlFor="editCategoryIsActive">Active</Label>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setIsEditingCategory(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateCategoryMutation.isPending}>
                  {updateCategoryMutation.isPending ? "Updating..." : "Update Category"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Option Dialog */}
        <Dialog open={isEditingOption} onOpenChange={setIsEditingOption}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Service Option</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdateOption} className="space-y-4">
              <div>
                <Label htmlFor="editOptionName">Option Name</Label>
                <Input
                  id="editOptionName"
                  value={optionForm.optionName}
                  onChange={(e) => setOptionForm({ ...optionForm, optionName: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editPrice">Price</Label>
                  <Input
                    id="editPrice"
                    type="number"
                    step="0.01"
                    value={optionForm.price}
                    onChange={(e) => setOptionForm({ ...optionForm, price: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="editCurrency">Currency</Label>
                  <Select value={optionForm.currency} onValueChange={(value) => setOptionForm({ ...optionForm, currency: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AUD">AUD</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="editOptionIsActive"
                  checked={optionForm.isActive}
                  onCheckedChange={(checked) => setOptionForm({ ...optionForm, isActive: checked })}
                />
                <Label htmlFor="editOptionIsActive">Active</Label>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setIsEditingOption(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateOptionMutation.isPending}>
                  {updateOptionMutation.isPending ? "Updating..." : "Update Option"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}