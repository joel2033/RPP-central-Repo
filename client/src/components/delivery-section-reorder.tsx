import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowUp, 
  ArrowDown, 
  Settings2, 
  Camera, 
  Building, 
  Video, 
  Globe, 
  Folder,
  Eye,
  EyeOff,
  GripVertical
} from "lucide-react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface SectionOrderConfig {
  sectionOrder: string[];
  sectionVisibility: Record<string, boolean>;
}

interface DeliverySectionReorderProps {
  jobCardId: number;
}

const sectionConfig = {
  photos: {
    label: "Photos",
    icon: Camera,
    description: "Property photography and image gallery"
  },
  floor_plans: {
    label: "Floor Plans",
    icon: Building,
    description: "Architectural drawings and layouts"
  },
  video: {
    label: "Video",
    icon: Video,
    description: "Video tours and promotional content"
  },
  virtual_tour: {
    label: "Virtual Tour",
    icon: Globe,
    description: "360° virtual property experience"
  },
  other_files: {
    label: "Other Files",
    icon: Folder,
    description: "Additional documents and media"
  }
};

const defaultOrder = ['photos', 'floor_plans', 'video', 'virtual_tour', 'other_files'];
const defaultVisibility = {
  photos: true,
  floor_plans: true,
  video: true,
  virtual_tour: true,
  other_files: true
};

export default function DeliverySectionReorder({ jobCardId }: DeliverySectionReorderProps) {
  const [open, setOpen] = useState(false);
  const [sectionOrder, setSectionOrder] = useState<string[]>(defaultOrder);
  const [sectionVisibility, setSectionVisibility] = useState<Record<string, boolean>>(defaultVisibility);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch current delivery settings
  const { data: deliverySettings } = useQuery({
    queryKey: [`/api/jobs/${jobCardId}/delivery-settings`],
    enabled: open,
  });

  // Update local state when settings are loaded
  useEffect(() => {
    if (deliverySettings) {
      setSectionOrder(deliverySettings.sectionOrder || defaultOrder);
      setSectionVisibility(deliverySettings.sectionVisibility || defaultVisibility);
    }
  }, [deliverySettings]);

  const updateSectionsMutation = useMutation({
    mutationFn: async (data: SectionOrderConfig) => {
      // If no delivery settings exist, create them first
      if (!deliverySettings) {
        return apiRequest("POST", `/api/jobs/${jobCardId}/delivery-settings`, {
          jobCardId,
          enableComments: true,
          enableDownloads: true,
          isPublic: true,
          passwordProtected: false,
          ...data
        });
      } else {
        return apiRequest("PUT", `/api/jobs/${jobCardId}/delivery-settings`, data);
      }
    },
    onSuccess: () => {
      toast({
        title: "Section order updated",
        description: "Delivery page sections have been reordered successfully",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/jobs/${jobCardId}/delivery-settings`] });
      setOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: "Failed to update section order. Please try again.",
        variant: "destructive",
      });
    },
  });

  const moveSection = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...sectionOrder];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex >= 0 && targetIndex < newOrder.length) {
      [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
      setSectionOrder(newOrder);
    }
  };

  const toggleSectionVisibility = (sectionKey: string) => {
    setSectionVisibility(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  const handleSave = () => {
    updateSectionsMutation.mutate({
      sectionOrder,
      sectionVisibility
    });
  };

  const resetToDefault = () => {
    setSectionOrder(defaultOrder);
    setSectionVisibility(defaultVisibility);
  };

  const visibleSections = sectionOrder.filter(key => sectionVisibility[key]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings2 className="h-4 w-4 mr-2" />
          Section Order
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Customize Delivery Page Sections</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Current Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Preview Order</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {visibleSections.map((sectionKey, index) => {
                  const config = sectionConfig[sectionKey as keyof typeof sectionConfig];
                  const Icon = config.icon;
                  return (
                    <Badge key={sectionKey} variant="secondary" className="flex items-center gap-1">
                      <span className="text-xs text-gray-500">{index + 1}.</span>
                      <Icon className="h-3 w-3" />
                      {config.label}
                    </Badge>
                  );
                })}
                {visibleSections.length === 0 && (
                  <span className="text-sm text-gray-500 italic">No sections visible</span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Section Management */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium">Section Order & Visibility</h3>
              <Button variant="outline" size="sm" onClick={resetToDefault}>
                Reset to Default
              </Button>
            </div>
            
            {sectionOrder.map((sectionKey, index) => {
              const config = sectionConfig[sectionKey as keyof typeof sectionConfig];
              const Icon = config.icon;
              const isVisible = sectionVisibility[sectionKey];
              
              return (
                <Card key={sectionKey} className={`transition-opacity ${!isVisible ? 'opacity-50' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <GripVertical className="h-4 w-4 text-gray-400" />
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          <div>
                            <p className="font-medium">{config.label}</p>
                            <p className="text-xs text-gray-500">{config.description}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {/* Visibility Toggle */}
                        <div className="flex items-center gap-2">
                          <Label htmlFor={`visible-${sectionKey}`} className="text-xs">
                            {isVisible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                          </Label>
                          <Switch
                            id={`visible-${sectionKey}`}
                            checked={isVisible}
                            onCheckedChange={() => toggleSectionVisibility(sectionKey)}
                            size="sm"
                          />
                        </div>
                        
                        {/* Move Buttons */}
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => moveSection(index, 'up')}
                            disabled={index === 0}
                            className="h-8 w-8 p-0"
                          >
                            <ArrowUp className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => moveSection(index, 'down')}
                            disabled={index === sectionOrder.length - 1}
                            className="h-8 w-8 p-0"
                          >
                            <ArrowDown className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t">
            <Button
              onClick={handleSave}
              disabled={updateSectionsMutation.isPending}
              className="flex-1"
            >
              {updateSectionsMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={updateSectionsMutation.isPending}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}