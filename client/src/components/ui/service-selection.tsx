import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, Home, Video, PlaneTakeoff, Package, ChevronDown, Search, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { type Product } from "@shared/schema";

interface SelectedService {
  productId: string;
  variantId?: string;
  productTitle: string;
  variantName?: string;
  price: number;
}

interface ServiceSelectionProps {
  value: string[];
  onChange: (services: string[]) => void;
  onProductsChange?: (products: SelectedService[]) => void;
  onTotalPriceChange?: (totalPrice: number) => void;
}

export default function ServiceSelection({ value, onChange, onProductsChange, onTotalPriceChange }: ServiceSelectionProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<SelectedService[]>([]);

  // Fetch products from API
  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  // For internal booking form, show all products (no filtering)
  const availableProducts = products || [];

  // Filter products based on search
  const filteredProducts = availableProducts.filter(product =>
    product.title.toLowerCase().includes(searchValue.toLowerCase()) ||
    (product.category && product.category.toLowerCase().includes(searchValue.toLowerCase()))
  );

  const getProductIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "photography": return Camera;
      case "drone": return PlaneTakeoff;
      case "floor_plans": return Home;
      case "video": return Video;
      default: return Package;
    }
  };

  const handleProductSelect = (product: Product) => {
    const productId = product.id;
    const isSelected = selectedProducts.some(p => p.productId === productId);
    
    if (isSelected) {
      // Remove product
      const newProducts = selectedProducts.filter(p => p.productId !== productId);
      setSelectedProducts(newProducts);
      onChange(newProducts.map(p => p.productId));
      onProductsChange?.(newProducts);
      // Calculate total price and notify parent
      const totalPrice = newProducts.reduce((sum, p) => sum + p.price, 0);
      onTotalPriceChange?.(totalPrice);
    } else {
      // Add product
      const newProduct: SelectedService = {
        productId: productId,
        productTitle: product.title,
        price: parseFloat(product.price),
      };
      
      const newProducts = [...selectedProducts, newProduct];
      setSelectedProducts(newProducts);
      onChange(newProducts.map(p => p.productId));
      onProductsChange?.(newProducts);
      // Calculate total price and notify parent
      const totalPrice = newProducts.reduce((sum, p) => sum + p.price, 0);
      onTotalPriceChange?.(totalPrice);
    }
  };

  const handleVariantSelect = (productId: string, variantId: string, variantName: string, variantPrice: number) => {
    const newProducts = selectedProducts.map(p => 
      p.productId === productId 
        ? { ...p, variantId, variantName, price: variantPrice }
        : p
    );
    setSelectedProducts(newProducts);
    onProductsChange?.(newProducts);
    // Calculate total price and notify parent
    const totalPrice = newProducts.reduce((sum, p) => sum + p.price, 0);
    onTotalPriceChange?.(totalPrice);
  };

  const isProductSelected = (productId: string) => {
    return selectedProducts.some(p => p.productId === productId);
  };

  const getSelectedVariant = (productId: string) => {
    return selectedProducts.find(p => p.productId === productId)?.variantId;
  };

  return (
    <div className="space-y-4">
      {/* Service Selection Dropdown */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Select Services</label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between"
            >
              {selectedProducts.length > 0 
                ? `${selectedProducts.length} service${selectedProducts.length > 1 ? 's' : ''} selected`
                : "Select services..."
              }
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0" align="start">
            <Command>
              <CommandInput 
                placeholder="Search services..." 
                value={searchValue}
                onValueChange={setSearchValue}
              />
              <CommandList>
                <CommandEmpty>
                  {isLoading ? "Loading services..." : "No services found."}
                </CommandEmpty>
                <CommandGroup>
                  <ScrollArea className="h-64">
                    {filteredProducts.map((product) => {
                      const Icon = getProductIcon(product.category || product.type);
                      const isSelected = isProductSelected(product.id);
                      
                      return (
                        <CommandItem
                          key={product.id}
                          onSelect={() => handleProductSelect(product)}
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center space-x-3">
                              <Check
                                className={cn(
                                  "h-4 w-4",
                                  isSelected ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <Icon className="h-4 w-4" />
                              <div>
                                <div className="font-medium">{product.title}</div>
                                <div className="text-sm text-gray-500">
                                  {product.category && (
                                    <Badge variant="outline" className="mr-2">
                                      {product.category}
                                    </Badge>
                                  )}
                                  From ${product.price}
                                </div>
                              </div>
                            </div>
                          </div>
                        </CommandItem>
                      );
                    })}
                  </ScrollArea>
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Selected Services with Variant Selection */}
      {selectedProducts.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Selected Services</h4>
          <div className="grid grid-cols-1 gap-3">
            {selectedProducts.map((selectedProduct) => {
              const product = availableProducts.find(p => p.id === selectedProduct.productId);
              if (!product) return null;
              
              const Icon = getProductIcon(product.category || product.type);
              const hasVariants = Array.isArray(product.variations) && product.variations.length > 0;
              
              return (
                <Card key={selectedProduct.productId} className="border-brand-blue bg-blue-50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Icon className="h-5 w-5" />
                        <div>
                          <div className="font-medium">{product.title}</div>
                          <div className="text-sm text-gray-600">
                            {product.description}
                          </div>
                          <div className="text-sm font-medium text-brand-blue mt-1">
                            ${selectedProduct.price}
                            {selectedProduct.variantName && (
                              <span className="ml-2 text-gray-500">
                                ({selectedProduct.variantName})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {hasVariants && (
                          <Select 
                            value={selectedProduct.variantId || ""}
                            onValueChange={(variantId) => {
                              const variant = product.variations[parseInt(variantId)];
                              if (variant) {
                                handleVariantSelect(
                                  product.id, 
                                  variantId, 
                                  variant.name, 
                                  parseFloat(variant.price || product.price)
                                );
                              }
                            }}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue placeholder="Select variant" />
                            </SelectTrigger>
                            <SelectContent>
                              {product.variations.map((variant: any, index: number) => (
                                <SelectItem key={index} value={index.toString()}>
                                  {variant.name} - ${variant.price || product.price}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleProductSelect(product)}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}