import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit2, Trash2, DollarSign, Package, Users, History, ChevronDown, ChevronUp } from "lucide-react";
import { editorServiceApi } from "@/lib/api/editorServiceApi";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/layout/layout";
import { apiRequest } from "@/lib/queryClient";
import type { EditorServiceCategory, EditorServiceOption, ServiceTemplate, User } from "@shared/schema";

interface ServiceStructure extends EditorServiceCategory {
  options: EditorServiceOption[];
}

export default function EditorServicePricing() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedEditorId, setSelectedEditorId] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<ServiceStructure | null>(null);
  const [selectedOption, setSelectedOption] = useState<EditorServiceOption | null>(null);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [isAddingOption, setIsAddingOption] = useState(false);
  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const [isEditingOption, setIsEditingOption] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Form states
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

  // Fetch available editors
  const { data: editors } = useQuery({
    queryKey: ["editors"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/photographers");
      return response.filter((user: User) => user.role === "editor");
    },
  });

  // Fetch editor's service structure
  const { data: serviceStructure, isLoading, error } = useQuery({
    queryKey: ["editor-services", selectedEditorId],
    queryFn: () => editorServiceApi.getEditorServices(selectedEditorId),
    enabled: !!selectedEditorId,
  });

  // Fetch service templates
  const { data: templates } = useQuery({
    queryKey: ["service-templates"],
    queryFn: () => editorServiceApi.getServiceTemplates(),
    enabled: showTemplates,
  });

  // Fetch change history
  const { data: changeHistory } = useQuery({
    queryKey: ["editor-service-history", selectedEditorId],
    queryFn: () => editorServiceApi.getChangeHistory(selectedEditorId),
    enabled: showHistory && !!selectedEditorId,
  });

  // Create category mutation
  const createCategoryMutation = useMutation({
    mutationFn: (data: typeof categoryForm) => editorServiceApi.createCategory(selectedEditorId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["editor-services", selectedEditorId] });
      setCategoryForm({ categoryName: "", isActive: true, displayOrder: 0 });
      setIsAddingCategory(false);
      toast({ title: "Category created successfully" });
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
      queryClient.invalidateQueries({ queryKey: ["editor-services", selectedEditorId] });
      setOptionForm({ optionName: "", price: "", currency: "AUD", isActive: true, displayOrder: 0 });
      setIsAddingOption(false);
      toast({ title: "Option created successfully" });
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
      queryClient.invalidateQueries({ queryKey: ["editor-services", selectedEditorId] });
      setIsEditingCategory(false);
      setSelectedCategory(null);
      toast({ title: "Category updated successfully" });
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
      queryClient.invalidateQueries({ queryKey: ["editor-services", selectedEditorId] });
      setIsEditingOption(false);
      setSelectedOption(null);
      toast({ title: "Option updated successfully" });
    },
    onError: (error) => {
      toast({ title: "Failed to update option", description: error.message, variant: "destructive" });
    },
  });

  // Delete category mutation
  const deleteCategoryMutation = useMutation({
    mutationFn: (categoryId: number) => editorServiceApi.deleteCategory(categoryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["editor-services", selectedEditorId] });
      toast({ title: "Category deleted successfully" });
    },
    onError: (error) => {
      toast({ title: "Failed to delete category", description: error.message, variant: "destructive" });
    },
  });

  // Delete option mutation
  const deleteOptionMutation = useMutation({
    mutationFn: (optionId: number) => editorServiceApi.deleteOption(optionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["editor-services", selectedEditorId] });
      toast({ title: "Option deleted successfully" });
    },
    onError: (error) => {
      toast({ title: "Failed to delete option", description: error.message, variant: "destructive" });
    },
  });

  // Apply template mutation
  const applyTemplateMutation = useMutation({
    mutationFn: (templateId: number) => editorServiceApi.applyTemplateToEditor(templateId, selectedEditorId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["editor-services", selectedEditorId] });
      toast({ title: "Template applied successfully" });
    },
    onError: (error) => {
      toast({ title: "Failed to apply template", description: error.message, variant: "destructive" });
    },
  });

  // Handle form submissions
  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.categoryName.trim()) return;
    createCategoryMutation.mutate(categoryForm);
  };

  const handleCreateOption = (e: React.FormEvent) => {
    e.preventDefault();
    if (!optionForm.optionName.trim() || !optionForm.price || !selectedCategory) return;
    createOptionMutation.mutate({
      ...optionForm,
      categoryId: selectedCategory.id,
    });
  };

  const handleUpdateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory) return;
    updateCategoryMutation.mutate({
      id: selectedCategory.id,
      updates: categoryForm,
    });
  };

  const handleUpdateOption = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOption) return;
    updateOptionMutation.mutate({
      id: selectedOption.id,
      updates: optionForm,
    });
  };

  // Calculate totals
  const totalCategories = serviceStructure?.length || 0;
  const totalOptions = serviceStructure?.reduce((sum, cat) => sum + cat.options.length, 0) || 0;
  const activeCategories = serviceStructure?.filter(cat => cat.isActive).length || 0;
  const activeOptions = serviceStructure?.reduce((sum, cat) => sum + cat.options.filter(opt => opt.isActive).length, 0) || 0;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">Failed to load editor services</p>
        <Button onClick={() => window.location.reload()} className="mt-4">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Editor Service Pricing</h1>
            <p className="text-gray-600">Manage custom services and pricing for editors</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-2"
              disabled={!selectedEditorId}
            >
              <History className="h-4 w-4" />
              History
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowTemplates(!showTemplates)}
              className="flex items-center gap-2"
            >
              <Package className="h-4 w-4" />
              Templates
            </Button>
          </div>
        </div>

        {/* Editor Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Editor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-w-sm">
              <Label htmlFor="editorSelect">Choose an editor to manage services for:</Label>
              <Select value={selectedEditorId} onValueChange={setSelectedEditorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an editor..." />
                </SelectTrigger>
                <SelectContent>
                  {editors?.map((editor) => (
                    <SelectItem key={editor.id} value={editor.id}>
                      {editor.firstName} {editor.lastName} ({editor.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {!selectedEditorId && (
          <div className="text-center py-12">
            <Users className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg text-gray-500 mb-2">Select an editor to get started</p>
            <p className="text-gray-400">Choose an editor from the dropdown above to manage their service pricing</p>
          </div>
        )}

        {selectedEditorId && (
          <>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-gray-600">Categories</p>
                <p className="text-2xl font-bold">{activeCategories}/{totalCategories}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-gray-600">Options</p>
                <p className="text-2xl font-bold">{activeOptions}/{totalOptions}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-gray-600">Avg. Price</p>
                <p className="text-2xl font-bold">
                  ${serviceStructure?.reduce((sum, cat) => 
                    sum + cat.options.reduce((optSum, opt) => optSum + parseFloat(opt.price), 0), 0
                  ) / Math.max(totalOptions, 1) || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <Button 
              onClick={() => setIsAddingCategory(true)}
              className="w-full h-full flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Category
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Service Structure */}
      <Card>
        <CardHeader>
          <CardTitle>Service Structure</CardTitle>
        </CardHeader>
        <CardContent>
          {serviceStructure?.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No service categories configured yet</p>
              <Button onClick={() => setIsAddingCategory(true)} className="mt-4">
                Create First Category
              </Button>
            </div>
          ) : (
            <Accordion type="multiple" className="space-y-2">
              {serviceStructure?.map((category) => (
                <AccordionItem key={category.id} value={category.id.toString()}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="flex items-center gap-3">
                        <Badge variant={category.isActive ? "default" : "secondary"}>
                          {category.isActive ? "Active" : "Inactive"}
                        </Badge>
                        <span className="font-medium">{category.categoryName}</span>
                        <span className="text-sm text-gray-500">
                          {category.options.length} options
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCategory(category);
                            setCategoryForm({
                              categoryName: category.categoryName,
                              isActive: category.isActive,
                              displayOrder: category.displayOrder,
                            });
                            setIsEditingCategory(true);
                          }}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Category</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{category.categoryName}"? This will also delete all options in this category.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteCategoryMutation.mutate(category.id)}
                                className="bg-red-500 hover:bg-red-600"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-4">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium">Service Options</h4>
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedCategory(category);
                            setIsAddingOption(true);
                          }}
                          className="flex items-center gap-2"
                        >
                          <Plus className="h-4 w-4" />
                          Add Option
                        </Button>
                      </div>
                      
                      {category.options.length === 0 ? (
                        <p className="text-center text-gray-500 py-4">No options configured</p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {category.options.map((option) => (
                            <div key={option.id} className="p-4 border rounded-lg">
                              <div className="flex justify-between items-start">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h5 className="font-medium">{option.optionName}</h5>
                                    <Badge variant={option.isActive ? "default" : "secondary"} className="text-xs">
                                      {option.isActive ? "Active" : "Inactive"}
                                    </Badge>
                                  </div>
                                  <p className="text-lg font-bold text-green-600 mt-1">
                                    ${option.price} {option.currency}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedOption(option);
                                      setOptionForm({
                                        optionName: option.optionName,
                                        price: option.price,
                                        currency: option.currency,
                                        isActive: option.isActive,
                                        displayOrder: option.displayOrder,
                                      });
                                      setIsEditingOption(true);
                                    }}
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
                                        <AlertDialogTitle>Delete Option</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure you want to delete "{option.optionName}"?
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => deleteOptionMutation.mutate(option.id)}
                                          className="bg-red-500 hover:bg-red-600"
                                        >
                                          Delete
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>

      {/* Add Category Dialog */}
      <Dialog open={isAddingCategory} onOpenChange={setIsAddingCategory}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Category</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateCategory} className="space-y-4">
            <div>
              <Label htmlFor="categoryName">Category Name</Label>
              <Input
                id="categoryName"
                value={categoryForm.categoryName}
                onChange={(e) => setCategoryForm({ ...categoryForm, categoryName: e.target.value })}
                placeholder="e.g., Basic Editing, Color Correction"
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

      {/* Edit Category Dialog */}
      <Dialog open={isEditingCategory} onOpenChange={setIsEditingCategory}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
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
                id="editIsActive"
                checked={categoryForm.isActive}
                onCheckedChange={(checked) => setCategoryForm({ ...categoryForm, isActive: checked })}
              />
              <Label htmlFor="editIsActive">Active</Label>
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

      {/* Add Option Dialog */}
      <Dialog open={isAddingOption} onOpenChange={setIsAddingOption}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Option</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateOption} className="space-y-4">
            <div>
              <Label htmlFor="optionName">Option Name</Label>
              <Input
                id="optionName"
                value={optionForm.optionName}
                onChange={(e) => setOptionForm({ ...optionForm, optionName: e.target.value })}
                placeholder="e.g., Basic Edit, HDR Processing"
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

      {/* Edit Option Dialog */}
      <Dialog open={isEditingOption} onOpenChange={setIsEditingOption}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Option</DialogTitle>
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
        )}
      </div>
    </Layout>
  );
}