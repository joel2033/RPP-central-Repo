
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Camera, Home, Video, PlaneTakeoff, Package, ChevronDown, Search, Check, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

interface SelectedService {
  serviceId: string;
  categoryId: string;
  categoryName: string;
  serviceName: string;
  price: number;
  currency: string;
}

interface ServiceSelectionProps {
  value: string[];
  onChange: (services: string[]) => void;
  onServicesChange?: (services: SelectedService[]) => void;
  onTotalPriceChange?: (totalPrice: number) => void;
  editorId?: string; // If provided, shows editor-specific services
  showProducts?: boolean; // If true, shows product-based services (fallback)
}

export default function ServiceSelection({ 
  value, 
  onChange, 
  onServicesChange, 
  onTotalPriceChange, 
  editorId,
  showProducts = true 
}: ServiceSelectionProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [selectedServices, setSelectedServices] = useState<SelectedService[]>([]);

  // Fetch editor-specific services if editorId is provided
  const { data: editorServices, isLoading: loadingEditorServices } = useQuery({
    queryKey: [`/api/editor-services/${editorId}`],
    enabled: !!editorId,
  });

  // Fetch products as fallback
  const { data: products, isLoading: loadingProducts } = useQuery({
    queryKey: ["/api/products"],
    enabled: showProducts && !editorId,
  });

  const isLoading = loadingEditorServices || loadingProducts;

  // Get available services based on context
  const getAvailableServices = () => {
    if (editorId && editorServices?.services) {
      return editorServices.services.filter((category: any) => category.isActive);
    }
    return [];
  };

  // Get available products (fallback)
  const getAvailableProducts = () => {
    if (!editorId && products) {
      return products.filter((product: any) => product.isActive);
    }
    return [];
  };

  // Filter services based on search
  const getFilteredServices = () => {
    const services = getAvailableServices();
    if (!searchValue) return services;
    
    return services.filter((category: any) =>
      category.category.toLowerCase().includes(searchValue.toLowerCase()) ||
      category.options.some((option: any) => 
        option.name.toLowerCase().includes(searchValue.toLowerCase())
      )
    );
  };

  // Filter products based on search
  const getFilteredProducts = () => {
    const availableProducts = getAvailableProducts();
    if (!searchValue) return availableProducts;
    
    return availableProducts.filter((product: any) =>
      product.title.toLowerCase().includes(searchValue.toLowerCase()) ||
      (product.category && product.category.toLowerCase().includes(searchValue.toLowerCase()))
    );
  };

  const handleServiceSelect = (categoryId: string, serviceId: string, serviceName: string, price: number, currency: string, categoryName: string) => {
    const serviceKey = `${categoryId}-${serviceId}`;
    const isSelected = selectedServices.some(s => s.serviceId === serviceKey);
    
    if (isSelected) {
      // Remove service
      const newServices = selectedServices.filter(s => s.serviceId !== serviceKey);
      setSelectedServices(newServices);
      onChange(newServices.map(s => s.serviceId));
      onServicesChange?.(newServices);
      
      const totalPrice = newServices.reduce((sum, s) => sum + s.price, 0);
      onTotalPriceChange?.(totalPrice);
    } else {
      // Add service
      const newService: SelectedService = {
        serviceId: serviceKey,
        categoryId,
        categoryName,
        serviceName,
        price,
        currency,
      };
      
      const newServices = [...selectedServices, newService];
      setSelectedServices(newServices);
      onChange(newServices.map(s => s.serviceId));
      onServicesChange?.(newServices);
      
      const totalPrice = newServices.reduce((sum, s) => sum + s.price, 0);
      onTotalPriceChange?.(totalPrice);
    }
  };

  const handleProductSelect = (product: any) => {
    // Fallback to original product selection logic
    const productId = product.id;
    const isSelected = selectedServices.some(s => s.serviceId === productId);
    
    if (isSelected) {
      const newServices = selectedServices.filter(s => s.serviceId !== productId);
      setSelectedServices(newServices);
      onChange(newServices.map(s => s.serviceId));
      onServicesChange?.(newServices);
      
      const totalPrice = newServices.reduce((sum, s) => sum + s.price, 0);
      onTotalPriceChange?.(totalPrice);
    } else {
      const newService: SelectedService = {
        serviceId: productId,
        categoryId: product.category || 'general',
        categoryName: product.category || 'General',
        serviceName: product.title,
        price: parseFloat(product.price),
        currency: 'AUD', // Default currency for products
      };
      
      const newServices = [...selectedServices, newService];
      setSelectedServices(newServices);
      onChange(newServices.map(s => s.serviceId));
      onServicesChange?.(newServices);
      
      const totalPrice = newServices.reduce((sum, s) => sum + s.price, 0);
      onTotalPriceChange?.(totalPrice);
    }
  };

  const isServiceSelected = (categoryId: string, serviceId: string) => {
    const serviceKey = `${categoryId}-${serviceId}`;
    return selectedServices.some(s => s.serviceId === serviceKey);
  };

  const isProductSelected = (productId: string) => {
    return selectedServices.some(s => s.serviceId === productId);
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
              {selectedServices.length > 0 
                ? `${selectedServices.length} service${selectedServices.length > 1 ? 's' : ''} selected`
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
                    {/* Editor-specific services */}
                    {editorId && (
                      <Accordion type="multiple" className="w-full">
                        {getFilteredServices().map((category: any) => (
                          <AccordionItem key={category.categoryId} value={category.categoryId}>
                            <AccordionTrigger className="px-3 py-2 text-sm">
                              <div className="flex items-center space-x-2">
                                <Package className="h-4 w-4" />
                                <span>{category.category}</span>
                                <Badge variant="outline" className="text-xs">
                                  {category.options.filter((opt: any) => opt.isActive).length}
                                </Badge>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-3">
                              <div className="space-y-1">
                                {category.options
                                  .filter((option: any) => option.isActive)
                                  .map((option: any) => {
                                    const isSelected = isServiceSelected(category.categoryId, option.id);
                                    
                                    return (
                                      <CommandItem
                                        key={option.id}
                                        onSelect={() => handleServiceSelect(
                                          category.categoryId,
                                          option.id,
                                          option.name,
                                          option.price,
                                          option.currency,
                                          category.category
                                        )}
                                      >
                                        <div className="flex items-center justify-between w-full">
                                          <div className="flex items-center space-x-3">
                                            <Check
                                              className={cn(
                                                "h-4 w-4",
                                                isSelected ? "opacity-100" : "opacity-0"
                                              )}
                                            />
                                            <div>
                                              <div className="font-medium">{option.name}</div>
                                              {option.description && (
                                                <div className="text-xs text-gray-500">{option.description}</div>
                                              )}
                                            </div>
                                          </div>
                                          <div className="flex items-center space-x-1 text-sm">
                                            <DollarSign className="h-3 w-3" />
                                            <span className="font-medium">{option.price.toFixed(2)}</span>
                                            <span className="text-gray-500">{option.currency}</span>
                                          </div>
                                        </div>
                                      </CommandItem>
                                    );
                                  })}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    )}
                    
                    {/* Product-based services (fallback) */}
                    {!editorId && getFilteredProducts().map((product: any) => {
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
                              <Camera className="h-4 w-4" />
                              <div>
                                <div className="font-medium">{product.title}</div>
                                <div className="text-sm text-gray-500">
                                  {product.category && (
                                    <Badge variant="outline" className="mr-2 text-xs">
                                      {product.category}
                                    </Badge>
                                  )}
                                  {product.description}
                                </div>
                              </div>
                            </div>
                            <div className="text-sm font-medium">
                              ${product.price}
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

      {/* Selected Services */}
      {selectedServices.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Selected Services</h4>
          <div className="grid grid-cols-1 gap-3">
            {selectedServices.map((service) => (
              <Card key={service.serviceId} className="border-brand-blue bg-blue-50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Package className="h-5 w-5" />
                      <div>
                        <div className="font-medium">{service.serviceName}</div>
                        <div className="text-sm text-gray-600">{service.categoryName}</div>
                        <div className="text-sm font-medium text-brand-blue mt-1 flex items-center">
                          <DollarSign className="h-3 w-3 mr-1" />
                          {service.price.toFixed(2)} {service.currency}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (editorId) {
                          const [categoryId, optionId] = service.serviceId.split('-');
                          handleServiceSelect(categoryId, optionId, service.serviceName, service.price, service.currency, service.categoryName);
                        } else {
                          const product = getAvailableProducts().find(p => p.id === service.serviceId);
                          if (product) handleProductSelect(product);
                        }
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {/* Total Price */}
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">Total Price</span>
                <div className="text-lg font-bold text-green-600 flex items-center">
                  <DollarSign className="h-4 w-4 mr-1" />
                  {selectedServices.reduce((sum, s) => sum + s.price, 0).toFixed(2)}
                  {selectedServices.length > 0 && (
                    <span className="ml-1 text-sm">
                      {selectedServices[0].currency}
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
