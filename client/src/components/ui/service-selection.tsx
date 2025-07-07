import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Camera, Home, Video, PlaneTakeoff } from "lucide-react";

interface ServiceSelectionProps {
  value: string[];
  onChange: (services: string[]) => void;
}

export default function ServiceSelection({ value, onChange }: ServiceSelectionProps) {
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
    console.log('handleToggle called with:', serviceValue);
    console.log('Current value:', value);
    
    const isSelected = value.includes(serviceValue);
    const newServices = isSelected 
      ? value.filter(v => v !== serviceValue)
      : [...value, serviceValue];
    
    console.log('New services:', newServices);
    onChange(newServices);
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