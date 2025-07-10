import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import Sidebar from "@/components/layout/sidebar";
import TopBar from "@/components/layout/topbar";
import { RoleProtectedRoute } from "@/components/auth/RoleProtectedRoute";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Minus, 
  Upload, 
  X, 
  Send,
  FileText,
  Image as ImageIcon,
  ChevronDown
} from "lucide-react";
import LoadingSpinner from "@/components/shared/loading-spinner";
import type { JobCard, Client, User, EditorServiceCategory, EditorServiceOption } from "@shared/schema";
import { editorServiceApi } from "@/lib/api/editorServiceApi";

interface JobCardWithDetails extends JobCard {
  client: Client;
  photographer: User | null;
}

interface ServiceBlock {
  id: string;
  service: string;
  categoryId: number;
  selectedOptionId?: number;
  selectedOptionName?: string;
  selectedOptionPrice?: number;
  quantity: number;
  files: File[];
  fileName: string;
  instructions: string;
  exportType: string;
  customDescription: string;
}

const exportTypes = [
  "Print Ready",
  "Web Optimized", 
  "Instagram Stories",
  "Instagram Posts",
  "Facebook Cover",
  "LinkedIn Banner",
  "Custom"
];

// Services will be loaded dynamically from editor service categories

function UploadToEditorContent() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [selectedEditorId, setSelectedEditorId] = useState<string>("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [serviceBlocks, setServiceBlocks] = useState<ServiceBlock[]>([]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, authLoading, toast]);

  const { data: jobCards, isLoading: jobsLoading } = useQuery<JobCardWithDetails[]>({
    queryKey: ["/api/job-cards"],
    queryFn: async () => {
      const response = await fetch("/api/job-cards?status=unassigned");
      if (!response.ok) throw new Error("Failed to fetch job cards");
      return response.json();
    },
    enabled: isAuthenticated,
  });

  const { data: editors, isLoading: editorsLoading } = useQuery<User[]>({
    queryKey: ["/api/editors"],
    enabled: isAuthenticated,
  });

  // Fetch editor service categories when editor is selected
  const { data: editorServiceCategories, isLoading: servicesLoading } = useQuery<(EditorServiceCategory & { options: EditorServiceOption[] })[]>({
    queryKey: ["/api/editor-services", selectedEditorId],
    queryFn: () => editorServiceApi.getEditorServices(selectedEditorId),
    enabled: !!selectedEditorId,
  });

  const selectedJob = jobCards?.find(job => job.id.toString() === selectedJobId);

  const createJobMutation = useMutation({
    mutationFn: async (jobData: any) => {
      // Update job card with editor assignment
      await apiRequest("PUT", `/api/job-cards/${selectedJobId}`, {
        editorId: selectedEditorId,
        status: "in_progress",
        editingNotes: jobData.instructions
      });

      // Upload files for each service block
      for (const block of serviceBlocks) {
        if (block.files.length > 0) {
          const formData = new FormData();
          
          // Add files to FormData
          block.files.forEach(file => {
            formData.append('files', file);
          });
          
          // Add metadata
          formData.append('fileName', block.fileName || '');
          formData.append('mediaType', 'raw');
          formData.append('serviceCategory', block.service.toLowerCase().replace(/\s+/g, '_'));
          formData.append('instructions', block.instructions);
          formData.append('exportType', block.exportType);
          formData.append('customDescription', block.customDescription);
          
          // Upload files using fetch with FormData
          const response = await fetch(`/api/job-cards/${selectedJobId}/files`, {
            method: 'POST',
            body: formData,
            credentials: 'include',
          });
          
          if (!response.ok) {
            throw new Error(`Failed to upload files for ${block.service}`);
          }
        }
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/job-cards"] });
      toast({
        title: "Success",
        description: "Job submitted to editor successfully",
      });
      // Reset form
      setSelectedJobId("");
      setSelectedEditorId("");
      setSelectedServices([]);
      setServiceBlocks([]);
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to submit job to editor",
        variant: "destructive",
      });
    },
  });

  const handleServiceSelect = (services: string[]) => {
    setSelectedServices(services);
    
    // Create service blocks for new services
    const newBlocks: ServiceBlock[] = services.map(service => {
      const existingBlock = serviceBlocks.find(block => block.service === service);
      const category = editorServiceCategories?.find(cat => cat.categoryName === service);
      return existingBlock || {
        id: Math.random().toString(),
        service,
        categoryId: category?.id || 0,
        quantity: 1,
        files: [],
        fileName: "",
        instructions: "",
        exportType: "",
        customDescription: ""
      };
    });
    
    setServiceBlocks(newBlocks);
  };

  const updateServiceBlock = (blockId: string, updates: Partial<ServiceBlock>) => {
    setServiceBlocks(blocks => 
      blocks.map(block => 
        block.id === blockId ? { ...block, ...updates } : block
      )
    );
  };

  const handleFileUpload = (blockId: string, files: FileList | null) => {
    if (!files) return;
    
    const fileArray = Array.from(files);
    updateServiceBlock(blockId, { files: fileArray });
  };

  const handleSubmit = () => {
    if (!selectedJobId || !selectedEditorId || serviceBlocks.length === 0) {
      toast({
        title: "Missing Information",
        description: "Please select a job, editor, and at least one service",
        variant: "destructive",
      });
      return;
    }

    const hasFiles = serviceBlocks.some(block => block.files.length > 0);
    if (!hasFiles) {
      toast({
        title: "No Files",
        description: "Please upload at least one file",
        variant: "destructive",
      });
      return;
    }

    const instructions = serviceBlocks
      .map(block => `${block.service}: ${block.instructions}`)
      .filter(Boolean)
      .join('\n');

    createJobMutation.mutate({ instructions });
  };

  if (authLoading || jobsLoading || editorsLoading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 ml-64">
          <TopBar title="Upload to Editor" />
          <div className="flex items-center justify-center h-64">
            <LoadingSpinner />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 ml-64">
        <TopBar title="Upload to Editor" />
        
        <div className="p-6 max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900 mb-2">New Order Information</h1>
            <p className="text-slate-600">Submit files and requirements to our editing team</p>
          </div>

          <div className="space-y-6">
            {/* Job Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Job</CardTitle>
                <p className="text-sm text-slate-600">Select the job you want to send for editing</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="job-select">Job Selection *</Label>
                  <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                    <SelectTrigger id="job-select">
                      <SelectValue placeholder="Choose a job..." />
                    </SelectTrigger>
                    <SelectContent>
                      {jobCards?.map((job) => (
                        <SelectItem key={job.id} value={job.id.toString()}>
                          {job.jobId ? `${job.jobId} - ` : ''}{job.client.name} ({job.requestedServices?.join(', ')})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedJob && (
                    <div className="mt-3 p-3 bg-slate-50 rounded-md">
                      <p className="text-sm font-medium">Property: {selectedJob.client.name}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {(selectedJob.requestedServices as string[])?.map((service) => (
                          <Badge key={service} variant="outline" className="text-xs">
                            {service}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Editor Selection */}
            {selectedJobId && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Editor</CardTitle>
                  <p className="text-sm text-slate-600">Choose which editor will handle this job</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label htmlFor="editor-select">Editor Selection *</Label>
                    <Select value={selectedEditorId} onValueChange={setSelectedEditorId}>
                      <SelectTrigger id="editor-select">
                        <SelectValue placeholder="Choose an editor..." />
                      </SelectTrigger>
                      <SelectContent>
                        {editors?.map((editor) => (
                          <SelectItem key={editor.id} value={editor.id}>
                            {editor.firstName} {editor.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Services Selection */}
            {selectedEditorId && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Services</CardTitle>
                  <p className="text-sm text-slate-600">Select the services needed for this job</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Label>Service Selection *</Label>
                    {servicesLoading ? (
                      <div className="flex items-center justify-center p-8">
                        <LoadingSpinner />
                        <span className="ml-2">Loading editor services...</span>
                      </div>
                    ) : editorServiceCategories && editorServiceCategories.length > 0 ? (
                      <div className="space-y-4">
                        {editorServiceCategories.map((category) => (
                          <Card key={category.id} className="border border-gray-200">
                            <CardHeader className="pb-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    id={`category-${category.id}`}
                                    checked={selectedServices.includes(category.categoryName)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedServices(prev => [...prev, category.categoryName]);
                                      } else {
                                        setSelectedServices(prev => prev.filter(s => s !== category.categoryName));
                                      }
                                    }}
                                    className="rounded border-slate-300"
                                  />
                                  <CardTitle className="text-base">{category.categoryName}</CardTitle>
                                </div>
                                {selectedServices.includes(category.categoryName) && category.options.length > 0 && (
                                  <Select
                                    value={serviceBlocks.find(block => block.service === category.categoryName)?.selectedOptionId?.toString() || ""}
                                    onValueChange={(value) => {
                                      const option = category.options.find(opt => opt.id.toString() === value);
                                      if (option) {
                                        updateServiceBlock(
                                          serviceBlocks.find(block => block.service === category.categoryName)?.id || "",
                                          {
                                            selectedOptionId: option.id,
                                            selectedOptionName: option.optionName,
                                            selectedOptionPrice: parseFloat(option.price)
                                          }
                                        );
                                      }
                                    }}
                                  >
                                    <SelectTrigger className="w-48">
                                      <SelectValue placeholder="Select pricing option" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {category.options.map((option) => (
                                        <SelectItem key={option.id} value={option.id.toString()}>
                                          {option.optionName} - ${option.price} {option.currency}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                )}
                              </div>
                              {category.description && (
                                <p className="text-sm text-gray-600 mt-1">{category.description}</p>
                              )}
                            </CardHeader>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center p-8 text-gray-500">
                        <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>This editor hasn't set up any service categories yet.</p>
                        <p className="text-sm">Contact the editor to configure their services.</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Service Blocks */}
            {serviceBlocks.map((block, index) => (
              <Card key={block.id} className="border-l-4 border-l-blue-500">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center">
                      <ImageIcon className="mr-2 h-5 w-5" />
                      {block.service}
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const newServices = selectedServices.filter(s => s !== block.service);
                        handleServiceSelect(newServices);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Quantity */}
                  <div className="flex items-center space-x-4">
                    <Label className="w-20">Quantity</Label>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateServiceBlock(block.id, { 
                          quantity: Math.max(1, block.quantity - 1) 
                        })}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-8 text-center">{block.quantity}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateServiceBlock(block.id, { 
                          quantity: block.quantity + 1 
                        })}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* File Upload */}
                  <div className="space-y-2">
                    <Label>Upload Files</Label>
                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-slate-400 transition-colors">
                      <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-slate-600 mb-2">Drag and drop files here or click to browse</p>
                      <input
                        type="file"
                        multiple
                        accept="image/*,video/*"
                        onChange={(e) => handleFileUpload(block.id, e.target.files)}
                        className="hidden"
                        id={`file-upload-${block.id}`}
                      />
                      <Button 
                        variant="outline" 
                        onClick={() => document.getElementById(`file-upload-${block.id}`)?.click()}
                      >
                        Select Files
                      </Button>
                      {block.files.length > 0 && (
                        <div className="mt-3 text-sm text-slate-600">
                          {block.files.length} file(s) selected
                        </div>
                      )}
                    </div>
                  </div>

                  {/* File Name */}
                  <div className="space-y-2">
                    <Label htmlFor={`filename-${block.id}`}>File Name (Optional)</Label>
                    <Input
                      id={`filename-${block.id}`}
                      placeholder="Custom file name..."
                      value={block.fileName}
                      onChange={(e) => updateServiceBlock(block.id, { fileName: e.target.value })}
                    />
                  </div>

                  {/* Instructions */}
                  <div className="space-y-2">
                    <Label htmlFor={`instructions-${block.id}`}>Instructions</Label>
                    <Textarea
                      id={`instructions-${block.id}`}
                      placeholder="Provide detailed instructions for the editor..."
                      value={block.instructions}
                      onChange={(e) => updateServiceBlock(block.id, { instructions: e.target.value })}
                      className="h-24"
                    />
                  </div>

                  {/* Export Type */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`export-${block.id}`}>Export Type</Label>
                      <Select 
                        value={block.exportType} 
                        onValueChange={(value) => updateServiceBlock(block.id, { exportType: value })}
                      >
                        <SelectTrigger id={`export-${block.id}`}>
                          <SelectValue placeholder="Select export type..." />
                        </SelectTrigger>
                        <SelectContent>
                          {exportTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {block.exportType === "Custom" && (
                      <div className="space-y-2">
                        <Label htmlFor={`custom-desc-${block.id}`}>Custom Description</Label>
                        <Input
                          id={`custom-desc-${block.id}`}
                          placeholder="Describe custom requirements..."
                          value={block.customDescription}
                          onChange={(e) => updateServiceBlock(block.id, { customDescription: e.target.value })}
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Submit Button */}
            {serviceBlocks.length > 0 && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-slate-900">Ready to Submit?</h3>
                      <p className="text-sm text-slate-600">
                        This will send the job to {editors?.find(e => e.id === selectedEditorId)?.firstName} {editors?.find(e => e.id === selectedEditorId)?.lastName} for editing
                      </p>
                    </div>
                    <Button 
                      onClick={handleSubmit}
                      disabled={createJobMutation.isPending}
                      size="lg"
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Send className="mr-2 h-5 w-5" />
                      {createJobMutation.isPending ? "Submitting..." : "Submit to Editor"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function UploadToEditor() {
  return <UploadToEditorContent />;
}