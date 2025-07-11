import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Settings, ExternalLink, Copy, CheckCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface DeliverySettingsModalProps {
  jobCardId: number;
  files: Array<{
    id: number;
    fileName: string;
    originalName: string;
    mediaType: string;
    serviceCategory?: string;
  }>;
}

interface DeliverySettings {
  id?: number;
  jobCardId: number;
  headerImageFileId?: number;
  enableComments: boolean;
  enableDownloads: boolean;
  customMessage?: string;
  deliveryUrl?: string;
  isPublic: boolean;
  passwordProtected: boolean;
  deliveryPassword?: string;
}

export default function DeliverySettingsModal({ jobCardId, files }: DeliverySettingsModalProps) {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<DeliverySettings>({
    jobCardId,
    enableComments: true,
    enableDownloads: true,
    isPublic: true,
    passwordProtected: false,
  });
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch existing delivery settings
  const { data: existingSettings } = useQuery({
    queryKey: [`/api/jobs/${jobCardId}/delivery-settings`],
    enabled: open,
  });

  // Update local state when data is fetched
  useEffect(() => {
    if (existingSettings) {
      setSettings(existingSettings);
    }
  }, [existingSettings]);

  // Create or update delivery settings
  const settingsMutation = useMutation({
    mutationFn: async (data: DeliverySettings) => {
      const method = existingSettings ? "PUT" : "POST";
      return apiRequest(method, `/api/jobs/${jobCardId}/delivery-settings`, data);
    },
    onSuccess: () => {
      toast({
        title: "Settings saved",
        description: "Delivery page settings have been updated",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/jobs/${jobCardId}/delivery-settings`] });
      setOpen(false);
    },
    onError: (error) => {
      console.error("Error saving delivery settings:", error);
      toast({
        title: "Failed to save",
        description: "Could not save delivery settings",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    settingsMutation.mutate(settings);
  };

  const generateDeliveryUrl = () => {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    const newUrl = `job-${jobCardId}-${timestamp}-${randomId}`;
    setSettings({ ...settings, deliveryUrl: newUrl });
  };

  const copyDeliveryLink = () => {
    const baseUrl = window.location.origin;
    const deliveryLink = `${baseUrl}/delivery/${jobCardId}`;
    navigator.clipboard.writeText(deliveryLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "Link copied",
      description: "Delivery page link copied to clipboard",
    });
  };

  const openDeliveryPage = () => {
    const deliveryLink = `/delivery/${jobCardId}`;
    window.open(deliveryLink, '_blank');
  };

  const imageFiles = files.filter(f => f.mediaType === 'image' || f.serviceCategory === 'photography');

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          Delivery Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Delivery Page Settings</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Delivery Link Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Delivery Link</h3>
            
            <div className="flex items-center space-x-2">
              <Button
                onClick={copyDeliveryLink}
                variant="outline"
                className="flex-1"
              >
                {copied ? (
                  <CheckCircle className="h-4 w-4 mr-2" />
                ) : (
                  <Copy className="h-4 w-4 mr-2" />
                )}
                {copied ? "Copied!" : "Copy Delivery Link"}
              </Button>
              <Button
                onClick={openDeliveryPage}
                variant="outline"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Preview
              </Button>
            </div>
            
            <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
              <strong>Direct Link:</strong> {window.location.origin}/delivery/{jobCardId}
            </div>
          </div>

          {/* Header Image Selection */}
          {imageFiles.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Header Banner Image</h3>
              <div>
                <Label htmlFor="headerImage">Select Header Image</Label>
                <Select
                  value={settings.headerImageFileId?.toString() || ""}
                  onValueChange={(value) => setSettings({
                    ...settings,
                    headerImageFileId: value ? parseInt(value) : undefined
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose header image (first photo used if none selected)" />
                  </SelectTrigger>
                  <SelectContent>
                    {imageFiles.map((file) => (
                      <SelectItem key={file.id} value={file.id.toString()}>
                        {file.originalName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Custom Message */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Custom Message</h3>
            <div>
              <Label htmlFor="customMessage">Welcome Message (optional)</Label>
              <Textarea
                id="customMessage"
                value={settings.customMessage || ""}
                onChange={(e) => setSettings({ ...settings, customMessage: e.target.value })}
                placeholder="Add a personalized message for your client..."
                rows={3}
              />
            </div>
          </div>

          {/* Features & Permissions */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Features & Permissions</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="enableDownloads">Enable Downloads</Label>
                  <p className="text-sm text-gray-600">Allow clients to download files</p>
                </div>
                <Switch
                  id="enableDownloads"
                  checked={settings.enableDownloads}
                  onCheckedChange={(checked) => setSettings({ ...settings, enableDownloads: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="enableComments">Enable Comments</Label>
                  <p className="text-sm text-gray-600">Allow client feedback and revision requests</p>
                </div>
                <Switch
                  id="enableComments"
                  checked={settings.enableComments}
                  onCheckedChange={(checked) => setSettings({ ...settings, enableComments: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="isPublic">Public Access</Label>
                  <p className="text-sm text-gray-600">Page is accessible via direct link</p>
                </div>
                <Switch
                  id="isPublic"
                  checked={settings.isPublic}
                  onCheckedChange={(checked) => setSettings({ ...settings, isPublic: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="passwordProtected">Password Protection</Label>
                  <p className="text-sm text-gray-600">Require password to access</p>
                </div>
                <Switch
                  id="passwordProtected"
                  checked={settings.passwordProtected}
                  onCheckedChange={(checked) => setSettings({ ...settings, passwordProtected: checked })}
                />
              </div>

              {settings.passwordProtected && (
                <div>
                  <Label htmlFor="deliveryPassword">Access Password</Label>
                  <Input
                    id="deliveryPassword"
                    type="password"
                    value={settings.deliveryPassword || ""}
                    onChange={(e) => setSettings({ ...settings, deliveryPassword: e.target.value })}
                    placeholder="Enter password for access"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Custom URL Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Custom URL (Optional)</h3>
            <div className="space-y-2">
              <Label htmlFor="deliveryUrl">Custom URL Slug</Label>
              <div className="flex space-x-2">
                <Input
                  id="deliveryUrl"
                  value={settings.deliveryUrl || ""}
                  onChange={(e) => setSettings({ ...settings, deliveryUrl: e.target.value })}
                  placeholder="custom-url-slug"
                />
                <Button onClick={generateDeliveryUrl} variant="outline">
                  Generate
                </Button>
              </div>
              {settings.deliveryUrl && (
                <p className="text-sm text-gray-600">
                  Custom URL: {window.location.origin}/delivery/url/{settings.deliveryUrl}
                </p>
              )}
            </div>
          </div>

          {/* Status Indicators */}
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Status</h3>
            <div className="flex flex-wrap gap-2">
              {settings.isPublic ? (
                <Badge variant="default">Public</Badge>
              ) : (
                <Badge variant="secondary">Private</Badge>
              )}
              {settings.passwordProtected && (
                <Badge variant="outline">Password Protected</Badge>
              )}
              {settings.enableDownloads && (
                <Badge variant="outline">Downloads Enabled</Badge>
              )}
              {settings.enableComments && (
                <Badge variant="outline">Comments Enabled</Badge>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={settingsMutation.isPending}
            >
              {settingsMutation.isPending ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}