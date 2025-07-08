import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useToast } from "@/hooks/use-toast";
import { insertBookingSchema, type Booking, type InsertBooking, type Client, type User } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Calendar, Clock, Camera, Home, Video, ChevronLeft, ChevronRight, Mail, PlaneTakeoff, UserIcon, AlertCircle } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";
import { z } from "zod";
import AddressInput from "@/components/ui/address-input";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { ServiceValidation } from "@/components/ui/service-validation";
import ServiceSelection from "@/components/ui/service-selection";

// Service Selection Component moved to separate file

interface BookingWithDetails extends Booking {
  client: Client;
  photographer: User | null;
}

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: BookingWithDetails | null;
}

const bookingFormSchema = insertBookingSchema.omit({ licenseeId: true }).extend({
  services: z.array(z.string()).optional(),
  propertyAddress: z.string().min(1, "Property address is required"),
});

export default function BookingModal({ isOpen, onClose, booking }: BookingModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(1);
  const [sendConfirmationEmail, setSendConfirmationEmail] = useState(true);
  const [addressCoordinates, setAddressCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Array<{
    productId: string;
    variantId?: string;
    productTitle: string;
    variantName?: string;
    price: number;
  }>>([]);
  
  const isEditing = !!booking;
  const totalSteps = 4;

  const form = useForm<z.infer<typeof bookingFormSchema>>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      clientId: 0,
      propertyAddress: "",
      scheduledDate: "",
      scheduledTime: "",
      services: [],
      status: "pending",
      photographerId: null,
      notes: "",
      price: "0.00",
    },
  });

  // Debug logging for service updates
  const handleServiceChange = useCallback((services: string[]) => {
    console.log('Service change triggered:', services);
    setSelectedServices(services);
  }, []);

  const handleProductsChange = useCallback((products: any[]) => {
    console.log('Products change triggered:', products);
    setSelectedProducts(products);
  }, []);

  const handleTotalPriceChange = useCallback((totalPrice: number) => {
    console.log('Total price change triggered:', totalPrice);
    // Update the form price field
    form.setValue('price', totalPrice.toFixed(2));
  }, [form]);

  // Load clients
  const { data: clients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  // Load photographers
  const { data: photographers } = useQuery<User[]>({
    queryKey: ["/api/photographers"],
  });

  useEffect(() => {
    console.log('useEffect triggered, booking:', booking);
    if (booking) {
      const services = booking.services as ("photography" | "drone" | "floor_plans" | "video")[];
      console.log('Setting services from booking:', services);
      setSelectedServices(services);
      form.reset({
        clientId: booking.clientId,
        propertyAddress: booking.propertyAddress,
        scheduledDate: booking.scheduledDate,
        scheduledTime: booking.scheduledTime,
        services: services,
        status: booking.status as "pending" | "confirmed" | "completed" | "cancelled",
        photographerId: booking.photographerId,
        notes: booking.notes || "",
        price: booking.price,
      });
    } else {
      console.log('Resetting services to empty array');
      setSelectedServices([]);
      form.reset({
        clientId: 0,
        propertyAddress: "",
        scheduledDate: "",
        scheduledTime: "",
        services: [],
        status: "pending",
        photographerId: null,
        notes: "",
        price: "0.00",
      });
    }
  }, [booking]);

  const createBookingMutation = useMutation({
    mutationFn: async (data: z.infer<typeof bookingFormSchema>) => {
      console.log("Making API request with data:", data);
      try {
        const response = await apiRequest("POST", "/api/bookings", data);
        console.log("API response:", response);
        return response;
      } catch (error) {
        console.error("API request failed:", error);
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: sendConfirmationEmail 
          ? "Job created and confirmation email sent!"
          : "Job created successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      handleClose();
    },
    onError: (error) => {
      console.error("Booking creation mutation error:", error);
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
      } else {
        toast({
          title: "Error",
          description: "Failed to create job",
          variant: "destructive",
        });
      }
    },
  });

  const updateBookingMutation = useMutation({
    mutationFn: async (data: z.infer<typeof bookingFormSchema>) => {
      return apiRequest(`/api/bookings/${booking?.id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Booking updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      handleClose();
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
      } else {
        toast({
          title: "Error",
          description: "Failed to update booking",
          variant: "destructive",
        });
      }
    },
  });

  const handleClose = () => {
    form.reset();
    setCurrentStep(1);
    setSendConfirmationEmail(true);
    setAddressCoordinates(null);
    setSelectedServices([]);
    onClose();
  };

  const nextStep = async () => {
    if (currentStep === 1) {
      // Validate step 1 fields
      const isValid = await form.trigger(["clientId", "propertyAddress"]);
      if (!isValid) return;
    }
    
    if (currentStep === 2) {
      // Validate step 2 - services
      if (selectedServices.length === 0) {
        toast({
          title: "Services Required",
          description: "Please select at least one service",
          variant: "destructive"
        });
        return;
      }

    }
    
    if (currentStep === 3) {
      // Validate step 3 - appointment details
      const isValid = await form.trigger(["scheduledDate", "scheduledTime"]);
      if (!isValid) return;
    }
    
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const onSubmit = async (data: z.infer<typeof bookingFormSchema>) => {
    console.log('Form submitted with data:', data);
    console.log('Selected services:', selectedServices);
    console.log('Selected products:', selectedProducts);
    
    // Validate that we have services selected
    if (selectedServices.length === 0) {
      toast({
        title: "Services Required",
        description: "Please select at least one service",
        variant: "destructive"
      });
      return;
    }
    
    // Ensure services are included from state
    const submitData = {
      ...data,
      services: selectedServices,
      selectedProducts: selectedProducts // Include selected products with variants
    };
    
    console.log('Final submit data:', submitData);
    
    if (isEditing) {
      updateBookingMutation.mutate(submitData);
    } else {
      createBookingMutation.mutate(submitData);
    }
  };

  const getServiceIcon = (service: string) => {
    switch (service) {
      case "photography": return <Camera className="h-4 w-4" />;
      case "drone": return <PlaneTakeoff className="h-4 w-4" />;
      case "floor_plans": return <Home className="h-4 w-4" />;
      case "video": return <Video className="h-4 w-4" />;
      default: return <Camera className="h-4 w-4" />;
    }
  };

  const selectedClient = clients?.find(c => c.id === form.watch("clientId"));
  const selectedPhotographer = photographers?.find(p => p.id === form.watch("photographerId"));
  const formData = form.getValues();

  const stepTitles = [
    "Client Information & Property Address",
    "Service Selection",
    "Appointment Date, Time & Photographer",
    "Order Summary"
  ];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Booking" : "Create New Job"}
          </DialogTitle>
          <DialogDescription>
            Step {currentStep} of {totalSteps}: {stepTitles[currentStep - 1]}
          </DialogDescription>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="flex justify-between mb-6">
          {Array.from({ length: totalSteps }, (_, i) => (
            <div key={i} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                i + 1 <= currentStep 
                  ? "bg-brand-blue text-white" 
                  : "bg-gray-200 text-gray-600"
              }`}>
                {i + 1}
              </div>
              {i < totalSteps - 1 && (
                <div className={`w-12 h-0.5 mx-2 ${
                  i + 1 < currentStep ? "bg-brand-blue" : "bg-gray-200"
                }`} />
              )}
            </div>
          ))}
        </div>

        <Form {...form}>
          <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
            {/* Step 1: Job Information */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <MapPin className="h-5 w-5 mr-2" />
                      Location & Client
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="clientId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Client *</FormLabel>
                          <Select onValueChange={(value) => field.onChange(parseInt(value))} 
                                  value={field.value?.toString() || ""}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a client" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {clients?.map((client) => (
                                <SelectItem key={client.id} value={client.id.toString()}>
                                  {client.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="propertyAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Property Address *</FormLabel>
                          <FormControl>
                            <AddressInput
                              value={field.value}
                              onChange={(value, coordinates) => {
                                field.onChange(value);
                                setAddressCoordinates(coordinates || null);
                              }}
                              placeholder="Enter property address"
                              required
                              error={form.formState.errors.propertyAddress?.message}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Step 2: Service Selection */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Services Required</CardTitle>
                    <p className="text-sm text-gray-600">Select all services needed for this job.</p>
                  </CardHeader>
                  <CardContent>
                    <ErrorBoundary fallback={
                      <div className="p-4 text-center text-red-600">
                        <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                        <p>Error loading services. Please refresh and try again.</p>
                      </div>
                    }>
                      <ServiceSelection 
                        value={selectedServices}
                        onChange={handleServiceChange}
                        onProductsChange={handleProductsChange}
                        onTotalPriceChange={handleTotalPriceChange}
                      />
                      <ServiceValidation selectedCount={selectedServices.length} />
                    </ErrorBoundary>
                  </CardContent>
                </Card>

                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Price</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Any special instructions or notes..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Step 3: Appointment Date, Time & Photographer */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Calendar className="h-5 w-5 mr-2" />
                      Appointment Scheduling
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="scheduledDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Date *</FormLabel>
                            <FormControl>
                              <DatePicker
                                value={field.value ? new Date(field.value) : undefined}
                                onChange={(date) => {
                                  if (date) {
                                    const dateStr = date instanceof Date ? date.toISOString().split('T')[0] : date;
                                    field.onChange(dateStr);
                                  } else {
                                    field.onChange("");
                                  }
                                }}
                                placeholder="Select a date"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="scheduledTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Time *</FormLabel>
                            <FormControl>
                              <TimePicker
                                value={field.value}
                                onChange={field.onChange}
                                placeholder="Set a start time"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="photographerId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Photographer (Optional)</FormLabel>
                          <Select onValueChange={(value) => field.onChange(value === "none" ? null : value)} value={field.value || "none"}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select photographer" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">No photographer assigned</SelectItem>
                              {photographers?.map((photographer) => (
                                <SelectItem key={photographer.id} value={photographer.id}>
                                  {photographer.firstName} {photographer.lastName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Step 4: Order Summary */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Order Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Client Info */}
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <UserIcon className="h-5 w-5 mr-2 text-gray-500" />
                        <div>
                          <div className="font-medium">{selectedClient?.name}</div>
                          <div className="text-sm text-gray-500">{selectedClient?.email}</div>
                        </div>
                      </div>
                    </div>

                    {/* Location */}
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <MapPin className="h-5 w-5 mr-2 text-gray-500" />
                        <div>
                          <div className="font-medium">Property Address</div>
                          <div className="text-sm text-gray-500">{formData.propertyAddress}</div>
                        </div>
                      </div>
                    </div>

                    {/* Schedule */}
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <Calendar className="h-5 w-5 mr-2 text-gray-500" />
                        <div>
                          <div className="font-medium">Scheduled</div>
                          <div className="text-sm text-gray-500">
                            {formData.scheduledDate} at {formData.scheduledTime}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Photographer */}
                    {selectedPhotographer && (
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center">
                          <UserIcon className="h-5 w-5 mr-2 text-gray-500" />
                          <div>
                            <div className="font-medium">Photographer</div>
                            <div className="text-sm text-gray-500">
                              {selectedPhotographer.firstName} {selectedPhotographer.lastName}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Services */}
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="font-medium mb-2">Services</div>
                      <div className="space-y-2">
                        {selectedProducts.length > 0 ? selectedProducts.map((product) => (
                          <div key={product.productId} className="flex items-center justify-between">
                            <div>
                              <span className="font-medium">{product.productTitle}</span>
                              {product.variantName && (
                                <span className="text-sm text-gray-500 ml-2">({product.variantName})</span>
                              )}
                            </div>
                            <span className="font-medium text-brand-blue">${product.price}</span>
                          </div>
                        )) : (
                          <span className="text-gray-500 text-sm">No services selected</span>
                        )}
                      </div>
                    </div>

                    {/* Price */}
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="font-medium">Total Price</div>
                      <div className="text-lg font-bold text-brand-blue">${formData.price}</div>
                    </div>

                    {/* Email Confirmation Toggle */}
                    {!isEditing && (
                      <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg">
                        <Checkbox
                          checked={sendConfirmationEmail}
                          onCheckedChange={setSendConfirmationEmail}
                        />
                        <Mail className="h-4 w-4 text-blue-600" />
                        <span className="text-sm">Send client confirmation email</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={currentStep === 1 ? handleClose : prevStep}
                className="flex items-center"
              >
                {currentStep === 1 ? (
                  "Cancel"
                ) : (
                  <>
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Previous
                  </>
                )}
              </Button>

              {currentStep < totalSteps ? (
                <Button
                  type="button"
                  onClick={nextStep}
                  className="bg-brand-blue hover:bg-blue-700 flex items-center"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={() => {
                    console.log('Create Job button clicked');
                    console.log('Form errors:', form.formState.errors);
                    console.log('Form valid:', form.formState.isValid);
                    form.handleSubmit(onSubmit)();
                  }}
                  className="bg-brand-blue hover:bg-blue-700"
                  disabled={createBookingMutation.isPending || updateBookingMutation.isPending}
                >
                  {createBookingMutation.isPending || updateBookingMutation.isPending
                    ? "Creating..."
                    : isEditing
                    ? "Update Booking"
                    : "Create Job"}
                </Button>
              )}
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}