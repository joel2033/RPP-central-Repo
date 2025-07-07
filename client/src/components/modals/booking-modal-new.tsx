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
import { z } from "zod";
import AddressInput from "@/components/ui/address-input";
import { ErrorBoundary } from "@/components/ui/error-boundary";

// Service Selection Component (separated to prevent re-render issues)
interface ServiceSelectionProps {
  value: string[];
  onChange: (services: string[]) => void;
}

function ServiceSelection({ value, onChange }: ServiceSelectionProps) {
  const services = [
    { 
      id: "photography", 
      value: "photography", 
      label: "Photography", 
      icon: Camera,
      description: "Interior and exterior property photos",
      price: "200",
      duration: "1-2 hours"
    },
    { 
      id: "drone", 
      value: "drone", 
      label: "Drone", 
      icon: PlaneTakeoff,
      description: "Aerial photography and videography",
      price: "150",
      duration: "30-60 minutes"
    },
    { 
      id: "floor_plans", 
      value: "floor_plans", 
      label: "Floor Plans", 
      icon: Home,
      description: "Detailed property floor plans",
      price: "100",
      duration: "1 hour"
    },
    { 
      id: "video", 
      value: "video", 
      label: "Video", 
      icon: Video,
      description: "Property walkthrough videos",
      price: "300",
      duration: "2-3 hours"
    },
  ];

  const handleToggle = (serviceValue: string) => {
    try {
      console.log('Service clicked:', serviceValue);
      
      const isSelected = value.includes(serviceValue);
      let newServices;
      
      if (isSelected) {
        newServices = value.filter(v => v !== serviceValue);
      } else {
        newServices = [...value, serviceValue];
      }
      
      console.log('New services array:', newServices);
      onChange(newServices);
    } catch (error) {
      console.error('Error updating services:', error);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {services.map((service) => {
        const Icon = service.icon;
        const isSelected = value.includes(service.value);
        
        return (
          <Card 
            key={service.id}
            className={`cursor-pointer transition-all ${
              isSelected ? "border-brand-blue bg-blue-50" : "hover:border-gray-300"
            }`}
            onClick={() => handleToggle(service.value)}
          >
            <CardContent className="p-4">
              <div className="flex items-center space-x-3 mb-2">
                <Checkbox
                  checked={isSelected}
                  readOnly
                />
                <Icon className="h-5 w-5" />
                <span className="font-medium">{service.label}</span>
              </div>
              <div className="text-sm text-gray-600 ml-8">
                <div>{service.description}</div>
                <div className="flex justify-between mt-1">
                  <span>From ${service.price}</span>
                  <span>{service.duration}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

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
  services: z.array(z.enum(["photography", "drone", "floor_plans", "video"])).min(1, "Select at least one service"),
  propertyAddress: z.string().min(1, "Property address is required"),
});

export default function BookingModal({ isOpen, onClose, booking }: BookingModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(1);
  const [sendConfirmationEmail, setSendConfirmationEmail] = useState(true);
  const [addressCoordinates, setAddressCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  
  const isEditing = !!booking;
  const totalSteps = 3;

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

  // Load clients
  const { data: clients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  // Load photographers
  const { data: photographers } = useQuery<User[]>({
    queryKey: ["/api/photographers"],
  });

  useEffect(() => {
    if (booking) {
      const services = booking.services as ("photography" | "drone" | "floor_plans" | "video")[];
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
  }, [booking, form]);

  const createBookingMutation = useMutation({
    mutationFn: async (data: z.infer<typeof bookingFormSchema>) => {
      return apiRequest("/api/bookings", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: sendConfirmationEmail 
          ? "Booking created and confirmation email sent!"
          : "Booking created successfully!",
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
          description: "Failed to create booking",
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
    
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const onSubmit = (data: z.infer<typeof bookingFormSchema>) => {
    // Ensure services are included from state
    const submitData = {
      ...data,
      services: selectedServices
    };
    
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
    "Job Information",
    "Appointment Details", 
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
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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

            {/* Step 2: Appointment Details */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Calendar className="h-5 w-5 mr-2" />
                      Scheduling
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
                              <Input type="date" {...field} />
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
                              <Input type="time" {...field} />
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

                <Card>
                  <CardHeader>
                    <CardTitle>Services Required</CardTitle>
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
                        onChange={(services) => {
                          console.log('Services updated:', services);
                          setSelectedServices(services);
                          form.setValue("services", services);
                        }}
                      />
                    </ErrorBoundary>
                  </CardContent>
                </Card>

                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price</FormLabel>
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

            {/* Step 3: Order Summary */}
            {currentStep === 3 && (
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
                      <div className="flex flex-wrap gap-2">
                        {selectedServices.map((service) => (
                          <Badge key={service} variant="secondary" className="flex items-center gap-1">
                            {getServiceIcon(service)}
                            {service.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </Badge>
                        ))}
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
                  type="submit"
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