import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertProductSchema, type Product, type InsertProduct } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Upload, X, Package, Image as ImageIcon, Plus } from "lucide-react";
import { z } from "zod";

interface Variant {
  name: string;
  price: number;
}

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}

const productFormSchema = insertProductSchema.omit({ licenseeId: true }).extend({
  title: z.string().min(1, "Product title is required"),
  type: z.enum(["product", "package", "addon"], { required_error: "Product type is required" }),
  price: z.string().min(1, "Price is required"),
});

export default function ProductModal({ isOpen, onClose, product }: ProductModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [variants, setVariants] = useState<Variant[]>([{ name: "", price: 0 }]);
  const [exclusiveClients, setExclusiveClients] = useState<string[]>([]);
  const [hasVariations, setHasVariations] = useState(false);
  const [isExclusive, setIsExclusive] = useState(false);

  const isEditing = !!product;

  const form = useForm<z.infer<typeof productFormSchema>>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      title: "",
      type: "product",
      description: "",
      image: "",
      category: "",
      price: "0.00",
      taxRate: "GST 10%",
      variations: [],
      isDigital: true,
      requiresOnsite: false,
      exclusiveClients: [],
      isActive: true,
      showOnBookingForm: false,
    },
  });

  useEffect(() => {
    if (product) {
      form.reset({
        title: product.title,
        type: product.type as "product" | "package" | "addon",
        description: product.description || "",
        image: product.image || "",
        category: product.category || "",
        price: product.price,
        taxRate: product.taxRate,
        variations: Array.isArray(product.variations) ? product.variations : [],
        isDigital: product.isDigital,
        requiresOnsite: product.requiresOnsite,
        exclusiveClients: product.exclusiveClients || [],
        isActive: product.isActive,
        showOnBookingForm: product.showOnBookingForm,
      });
      // Convert old variations format to new variant format if needed
      const productVariants = Array.isArray(product.variations) 
        ? product.variations.map((v: any) => 
            typeof v === 'string' 
              ? { name: v, price: 0 } 
              : { name: v.name || '', price: parseFloat(v.price) || 0 }
          )
        : [{ name: "", price: 0 }];
      setVariants(productVariants);
      setExclusiveClients(product.exclusiveClients || []);
      setHasVariations(Array.isArray(product.variations) && product.variations.length > 0);
      setIsExclusive((product.exclusiveClients || []).length > 0);
    } else {
      form.reset({
        title: "",
        type: "product",
        description: "",
        image: "",
        category: "",
        price: "0.00",
        taxRate: "GST 10%",
        variations: [{ name: "", price: 0 }],
        isDigital: true,
        requiresOnsite: false,
        exclusiveClients: [],
        isActive: true,
        showOnBookingForm: false,
      });
      setVariants([{ name: "", price: 0 }]);
      setExclusiveClients([]);
      setHasVariations(false);
      setIsExclusive(false);
    }
  }, [product, form]);

  const createProductMutation = useMutation({
    mutationFn: async (data: z.infer<typeof productFormSchema>) => {
      return await apiRequest("POST", "/api/products", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Success",
        description: "Product created successfully",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to create product",
        variant: "destructive",
      });
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: async (data: z.infer<typeof productFormSchema>) => {
      return await apiRequest("PUT", `/api/products/${product?.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Success",
        description: "Product updated successfully",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to update product",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof productFormSchema>) => {
    const submitData = {
      ...data,
      variations: hasVariations ? variants : [],
      exclusiveClients: isExclusive ? exclusiveClients : [],
    };

    if (isEditing) {
      updateProductMutation.mutate(submitData);
    } else {
      createProductMutation.mutate(submitData);
    }
  };

  const addVariant = () => {
    setVariants([...variants, { name: "", price: 0 }]);
  };

  const updateVariant = (index: number, field: 'name' | 'price', value: string | number) => {
    const newVariants = [...variants];
    newVariants[index] = { ...newVariants[index], [field]: value };
    setVariants(newVariants);
  };

  const removeVariant = (index: number) => {
    if (variants.length > 1) {
      setVariants(variants.filter((_, i) => i !== index));
    }
  };

  const addExclusiveClient = () => {
    setExclusiveClients([...exclusiveClients, ""]);
  };

  const updateExclusiveClient = (index: number, value: string) => {
    const newClients = [...exclusiveClients];
    newClients[index] = value;
    setExclusiveClients(newClients);
  };

  const removeExclusiveClient = (index: number) => {
    setExclusiveClients(exclusiveClients.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Product" : "Create New Product"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select product type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="product">Product</SelectItem>
                          <SelectItem value="package">Package</SelectItem>
                          <SelectItem value="addon">Add-on</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter product title" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Enter product description" 
                          rows={3}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Photography, Video, etc." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Image Upload Placeholder */}
                <div>
                  <Label>Product Image</Label>
                  <Card className="border-dashed border-2 border-gray-300 hover:border-gray-400 transition-colors">
                    <CardContent className="flex flex-col items-center justify-center p-6">
                      <ImageIcon className="h-12 w-12 text-gray-400 mb-4" />
                      <p className="text-sm text-gray-600 text-center">
                        Drag and drop an image here, or click to select
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        JPG, PNG up to 2MB
                      </p>
                      <Button type="button" variant="outline" className="mt-4">
                        <Upload className="h-4 w-4 mr-2" />
                        Choose File
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price (Before Tax)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01" 
                            placeholder="0.00" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="taxRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tax Rate</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="GST 10%">GST 10%</SelectItem>
                            <SelectItem value="0%">0%</SelectItem>
                            <SelectItem value="GST 15%">GST 15%</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Service Type */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <FormField
                      control={form.control}
                      name="isDigital"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Digital Service</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <FormField
                      control={form.control}
                      name="requiresOnsite"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Requires On-site Attendance</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Variations */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={hasVariations}
                      onCheckedChange={setHasVariations}
                    />
                    <Label>Enable Variations</Label>
                  </div>

                  {hasVariations && (
                    <div className="space-y-3">
                      <div className="text-sm font-medium text-gray-700 mb-2">
                        Product Variants
                      </div>
                      {variants.map((variant, index) => (
                        <div key={index} className="grid grid-cols-3 gap-2 items-center">
                          <Input
                            placeholder="Variant name"
                            value={variant.name}
                            onChange={(e) => updateVariant(index, 'name', e.target.value)}
                          />
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="Price"
                            value={variant.price}
                            onChange={(e) => updateVariant(index, 'price', parseFloat(e.target.value) || 0)}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeVariant(index)}
                            disabled={variants.length === 1}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addVariant}
                        className="flex items-center gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Add Variant
                      </Button>
                    </div>
                  )}
                </div>

                {/* Exclusive Product */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={isExclusive}
                      onCheckedChange={setIsExclusive}
                    />
                    <Label>Exclusive Product (Restricted Clients)</Label>
                  </div>

                  {isExclusive && (
                    <div className="space-y-2">
                      {exclusiveClients.map((client, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <Input
                            placeholder="Client name or ID"
                            value={client}
                            onChange={(e) => updateExclusiveClient(index, e.target.value)}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeExclusiveClient(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addExclusiveClient}
                      >
                        Add Client
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Section */}
            <div className="border-t pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="showOnBookingForm"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Show on Booking Form</FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Active Status</FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex space-x-3">
                  <Button type="button" variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createProductMutation.isPending || updateProductMutation.isPending}
                  >
                    {createProductMutation.isPending || updateProductMutation.isPending 
                      ? "Saving..." 
                      : isEditing ? "Update Product" : "Create Product"
                    }
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}