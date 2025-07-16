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
  ChevronDown,
  Link as LinkIcon
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
  fileEntries?: Array<{ fileName: string; instruction: string; }>;
  exportEntries?: Array<{ type: string; description: string; }>;
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

// File Upload Modal Component
function FileUploadModal({ 
  blockId, 
  onFilesUpload, 
  uploadedFiles 
}: { 
  blockId: string; 
  onFilesUpload: (files: File[]) => void; 
  uploadedFiles: File[]; 
}) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [urlLink, setUrlLink] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<Map<string, number>>(new Map());
  const [isUploading, setIsUploading] = useState(false);
  const [uploadErrors, setUploadErrors] = useState<Map<string, string>>(new Map());

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles(prev => [...prev, ...droppedFiles]);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...selectedFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeUploadedFile = (index: number) => {
    const newUploadedFiles = uploadedFiles.filter((_, i) => i !== index);
    onFilesUpload(newUploadedFiles);
  };

  // Helper function for presigned URL upload
  const uploadViaPresignedUrl = async (file: File, fileName: string, jobCardId: number) => {
    // Get presigned upload URL with timeout and CORS
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
    
    let uploadUrlResponse;
    try {
      uploadUrlResponse = await fetch(`/api/job-cards/${jobCardId}/files/upload-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        mode: 'cors',
        signal: controller.signal,
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type,
          mediaType: 'raw', // This will add 'type: raw' tag in S3
          fileSize: file.size
        })
      });
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.error('Fetch error for presigned URL:', err);
      
      if (err.name === 'AbortError') {
        throw new Error('Request timed out - try again');
      }
      throw err;
    }
    
    clearTimeout(timeoutId);

    if (!uploadUrlResponse.ok) {
      const errorText = await uploadUrlResponse.text();
      console.error(`Failed to get upload URL: ${uploadUrlResponse.status} - ${errorText}`);
      throw new Error(`Failed to get upload URL: ${uploadUrlResponse.status}`);
    }

    const { uploadUrl, s3Key } = await uploadUrlResponse.json();
    console.log(`Got presigned URL for ${fileName}, S3 key: ${s3Key}`);

    // Upload to S3 with progress tracking
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          console.log(`Upload progress for ${fileName}: ${progress}%`);
          setUploadingFiles(prev => new Map(prev.set(fileName, progress)));
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          console.log(`S3 upload completed for ${fileName}`);
          resolve();
        } else {
          console.error(`S3 upload failed for ${fileName}:`, {
            status: xhr.status,
            statusText: xhr.statusText,
            response: xhr.response,
            responseText: xhr.responseText,
            headers: xhr.getAllResponseHeaders()
          });
          reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.statusText}`));
        }
      };

      xhr.onerror = (event) => {
        console.error(`S3 upload error for ${fileName}:`, {
          error: event,
          status: xhr.status,
          statusText: xhr.statusText,
          response: xhr.response,
          responseText: xhr.responseText,
          readyState: xhr.readyState,
          errorType: 'XMLHttpRequest onerror'
        });
        
        // More specific error messages for CORS and network issues
        let errorMessage = 'Network error';
        if (xhr.status === 0) {
          errorMessage = 'CORS error - S3 bucket may not allow requests from this domain';
        } else if (xhr.statusText) {
          errorMessage = xhr.statusText;
        }
        
        reject(new Error(`Upload failed: ${errorMessage}`));
      };

      xhr.ontimeout = () => {
        console.error(`S3 upload timeout for ${fileName}`);
        reject(new Error('Upload timeout - file too large or connection too slow'));
      };

      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.timeout = 300000; // 5 minutes timeout
      
      // Add CORS headers if needed
      xhr.withCredentials = false; // Don't send cookies to S3
      
      console.log(`Uploading ${fileName} to S3 with Content-Type: ${file.type}`);
      console.log(`S3 Upload URL: ${uploadUrl.substring(0, 100)}...`);
      xhr.send(file);
    });

    // Save metadata to database
    const metadataResponse = await fetch(`/api/job-cards/${jobCardId}/files/metadata`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        fileName: file.name,
        originalName: file.name,
        s3Key: s3Key,
        fileSize: file.size,
        mimeType: file.type,
        mediaType: 'raw',
        serviceCategory: 'photography',
        instructions: '',
        exportType: '',
        customDescription: ''
      })
    });

    if (!metadataResponse.ok) {
      console.error(`Failed to save metadata for ${fileName}`);
      throw new Error('Failed to save file metadata');
    }

    console.log(`Successfully uploaded ${fileName} to S3 with metadata`);
  };

  // Helper function for server-side proxy upload
  const uploadViaServerProxy = async (file: File, fileName: string, jobCardId: number) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mediaType', 'raw');
    formData.append('serviceCategory', 'photography');
    formData.append('instructions', '');
    formData.append('exportType', '');
    formData.append('customDescription', '');

    console.log(`Uploading ${fileName} via server proxy`);

    const response = await fetch(`/api/job-cards/${jobCardId}/files/upload-proxy`, {
      method: 'POST',
      credentials: 'include',
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Server proxy upload failed: ${response.status} - ${errorText}`);
      throw new Error(`Server proxy upload failed: ${response.status}`);
    }

    const result = await response.json();
    console.log(`Successfully uploaded ${fileName} via server proxy`);
    return result;
  };

  const uploadFileToS3 = async (file: File, jobCardId: number): Promise<void> => {
    const fileName = file.name;
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Starting S3 upload for ${fileName}, size: ${file.size} (attempt ${attempt}/${maxRetries})`);
        
        // Try presigned URL upload first
        try {
          await uploadViaPresignedUrl(file, fileName, jobCardId);
          console.log(`Successfully uploaded ${fileName} via presigned URL`);
          
          // Clean up progress tracking
          setUploadingFiles(prev => {
            const newMap = new Map(prev);
            newMap.delete(fileName);
            return newMap;
          });
          
          // Clear any previous errors
          setUploadErrors(prev => {
            const newMap = new Map(prev);
            newMap.delete(fileName);
            return newMap;
          });
          
          return; // Success, exit retry loop
        } catch (presignedError: any) {
          console.log(`Presigned URL upload failed for ${fileName}:`, presignedError.message);
          console.error('Full presigned URL error:', presignedError);
          
          // Handle timeout errors with toast notification
          if (presignedError.message.includes('Request timed out')) {
            toast({
              title: "Upload Timeout",
              description: "Request timed out - try again",
              variant: "destructive"
            });
            throw presignedError;
          }
          
          // If it's a CORS error, fall back to server-side proxy
          if (presignedError.message.includes('CORS') || presignedError.message.includes('Network error')) {
            console.log(`Falling back to server-side proxy for ${fileName}`);
            await uploadViaServerProxy(file, fileName, jobCardId);
            console.log(`Successfully uploaded ${fileName} via server proxy`);
            
            // Clean up progress tracking
            setUploadingFiles(prev => {
              const newMap = new Map(prev);
              newMap.delete(fileName);
              return newMap;
            });
            
            // Clear any previous errors
            setUploadErrors(prev => {
              const newMap = new Map(prev);
              newMap.delete(fileName);
              return newMap;
            });
            
            return; // Success, exit retry loop
          } else {
            // Re-throw non-CORS errors for retry
            throw presignedError;
          }
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        console.error(`Upload attempt ${attempt} failed for ${fileName}:`, {
          error: lastError.message,
          code: (error as any).code,
          name: (error as any).name
        });
        
        // Show specific toast messages for different error types
        if (attempt === maxRetries) {
          let toastMessage = lastError.message;
          let toastTitle = "Upload Failed";
          
          if (lastError.name === 'AbortError') {
            toastTitle = "Upload Timeout";
            toastMessage = "Upload timed out - try a smaller file or check your connection";
          } else if (lastError.name === 'TypeError') {
            toastTitle = "Network Error";
            toastMessage = "Network error - check your internet connection";
          } else if (lastError.message.includes('CORS')) {
            toastTitle = "CORS Error";
            toastMessage = "S3 bucket configuration issue - contact administrator";
          }
          
          toast({
            title: toastTitle,
            description: toastMessage,
            variant: "destructive"
          });
        }
        
        // If this is the last attempt, set error state
        if (attempt === maxRetries) {
          setUploadErrors(prev => new Map(prev.set(fileName, lastError!.message)));
          setUploadingFiles(prev => {
            const newMap = new Map(prev);
            newMap.delete(fileName);
            return newMap;
          });
        } else {
          // Wait before retrying (exponential backoff)
          const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
          console.log(`Retrying upload for ${fileName} in ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // If we get here, all retries failed
    throw lastError || new Error('Upload failed after all retries');
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    
    setIsUploading(true);
    setUploadErrors(new Map()); // Clear previous errors
    console.log(`Starting upload of ${files.length} files`);
    
    try {
      // For now, use job card ID 1 as a test, but this should be passed from parent component
      const jobCardId = 1;
      
      // Check if S3 is configured by trying to get an upload URL
      let s3Available = false;
      try {
        const testResponse = await fetch(`/api/job-cards/${jobCardId}/files/upload-url`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ fileName: 'test', contentType: 'text/plain', fileSize: 1 })
        });
        s3Available = testResponse.status !== 503;
        console.log(`S3 availability check: ${s3Available ? 'available' : 'not available'}`);
      } catch (error) {
        console.log('S3 availability check failed, using simulation');
        s3Available = false;
      }

      if (s3Available) {
        // Use S3 upload
        console.log('Using S3 upload');
        const uploadPromises = files.map(file => uploadFileToS3(file, jobCardId));
        await Promise.all(uploadPromises);
      } else {
        // Fallback to simulation
        console.log('Using simulation upload');
        const uploadPromises = files.map(file => simulateUpload(file));
        await Promise.all(uploadPromises);
      }
      
      // Add files to uploaded files
      onFilesUpload([...uploadedFiles, ...files]);
      
      setFiles([]);
      setUrlLink("");
      console.log('Upload completed successfully');
    } catch (error) {
      console.error('Upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.log(`Upload failed: ${errorMessage}`);
      
      // Show error toast
      toast({
        title: "Upload Failed",
        description: `Failed to upload files: ${errorMessage}`,
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const simulateUpload = async (file: File): Promise<void> => {
    return new Promise((resolve) => {
      const fileName = file.name;
      const duration = 2000; // 2 seconds for demo
      const steps = 100;
      const stepDuration = duration / steps;
      
      let progress = 0;
      const interval = setInterval(() => {
        progress += 1;
        setUploadingFiles(prev => new Map(prev.set(fileName, progress)));
        
        if (progress >= 100) {
          clearInterval(interval);
          setUploadingFiles(prev => {
            const newMap = new Map(prev);
            newMap.delete(fileName);
            return newMap;
          });
          resolve();
        }
      }, stepDuration);
    });
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2"
      >
        <Upload className="h-4 w-4" />
        Upload
      </Button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-semibold">Upload Files</h3>
                {isUploading && (
                  <p className="text-sm text-gray-600">
                    Uploading files {uploadedFiles.length + Array.from(uploadingFiles.keys()).length} of {uploadedFiles.length + files.length}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {!isUploading && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById(`file-input-${blockId}`)?.click()}
                  >
                    Add
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  disabled={isUploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Include any input files that your supplier may require to carry out this service.
            </p>

            {/* Conditional Display: Drop Zone OR File List */}
            {(uploadedFiles.length === 0 && uploadingFiles.size === 0 && files.length === 0) ? (
              /* File Drop Zone - Only show when no files */
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center mb-4 transition-colors ${
                  dragActive ? "border-blue-500 bg-blue-50" : "border-gray-300"
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center mb-4">
                    <Upload className="h-6 w-6 text-gray-400" />
                  </div>
                  <p className="mb-2">
                    Drop your file(s) here, or{" "}
                    <button
                      type="button"
                      onClick={() => document.getElementById(`file-input-${blockId}`)?.click()}
                      className="text-blue-600 underline"
                    >
                      browse.
                    </button>
                  </p>
                  <p className="text-xs text-gray-500">
                    Supported formats: JPG, DNG, PNG, PDF. Each file's maximum size is 25MB.
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Maximum upload size: 2GB. If your total input files exceed this limit, please use the URL upload option.
                  </p>
                </div>
                <input
                  id={`file-input-${blockId}`}
                  type="file"
                  multiple
                  accept="image/*,video/*,.pdf"
                  onChange={handleFileInput}
                  className="hidden"
                />
              </div>
            ) : (
              /* File List Display - Show when files are present */
              <div 
                className="mb-4"
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-sm font-medium">
                    Files ({uploadedFiles.length + uploadingFiles.size + files.length})
                  </h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById(`file-input-${blockId}`)?.click()}
                    disabled={isUploading}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add More
                  </Button>
                </div>
                <div className="max-h-64 overflow-y-auto space-y-2 border rounded-lg p-3 bg-gray-50">
                  {/* Already uploaded files */}
                  {uploadedFiles.map((file, index) => (
                    <div key={`uploaded-${index}`} className="flex items-center justify-between p-3 bg-white rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="text-sm font-medium">{file.name}</div>
                        <div className="flex items-center space-x-2">
                          <div className="text-xs text-green-600">100%</div>
                          <div className="w-32 h-2 bg-gray-200 rounded-full">
                            <div className="w-full h-2 bg-black rounded-full"></div>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeUploadedFile(index)}
                        disabled={isUploading}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  
                  {/* Currently uploading files */}
                  {Array.from(uploadingFiles.entries()).map(([fileName, progress]) => (
                    <div key={`uploading-${fileName}`} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="text-sm font-medium">{fileName}</div>
                        <div className="flex items-center space-x-2">
                          <div className="text-xs text-blue-600">{progress}%</div>
                          <div className="w-32 h-2 bg-gray-200 rounded-full">
                            <div 
                              className="h-2 bg-black rounded-full transition-all duration-100"
                              style={{ width: `${progress}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                      <X className="h-4 w-4 text-gray-400" />
                    </div>
                  ))}
                  
                  {/* Pending files (not yet uploading) */}
                  {files.filter(file => !uploadingFiles.has(file.name)).map((file, index) => {
                    const error = uploadErrors.get(file.name);
                    return (
                      <div key={`pending-${index}`} className={`flex items-center justify-between p-3 rounded-lg ${error ? 'bg-red-50' : 'bg-white'}`}>
                        <div className="flex items-center space-x-3">
                          <div className="text-sm font-medium">{file.name}</div>
                          <div className="flex items-center space-x-2">
                            {error ? (
                              <div className="text-xs text-red-600">Error: {error}</div>
                            ) : (
                              <>
                                <div className="text-xs text-gray-500">0%</div>
                                <div className="w-32 h-2 bg-gray-200 rounded-full">
                                  <div className="w-0 h-2 bg-black rounded-full"></div>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(files.indexOf(file))}
                          disabled={isUploading}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
                <input
                  id={`file-input-${blockId}`}
                  type="file"
                  multiple
                  accept="image/*,video/*,.pdf"
                  onChange={handleFileInput}
                  className="hidden"
                />
              </div>
            )}

            

            <p className="text-sm text-gray-500 text-center mb-4">
              Files uploaded will be automatically removed after 14 days.
            </p>

            <div className="text-center text-gray-500 mb-4">OR</div>

            {/* URL Upload */}
            <div className="mb-4">
              <h4 className="text-sm font-medium mb-2">URL Upload</h4>
              <div className="flex gap-2">
                <Input
                  placeholder="Paste your URL here"
                  value={urlLink}
                  onChange={(e) => setUrlLink(e.target.value)}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  onClick={() => {
                    // Handle URL upload logic here
                    console.log("URL Upload:", urlLink);
                  }}
                >
                  Add
                </Button>
              </div>
            </div>

            {/* Confirmation */}
            <div className="flex items-start gap-2 mb-4">
              <input
                type="checkbox"
                id={`confirm-${blockId}`}
                className="mt-1"
              />
              <label htmlFor={`confirm-${blockId}`} className="text-xs text-gray-600">
                I confirm the link I am providing has been set to viewable and contains the input files required for this service.
              </label>
            </div>

            {/* Upload Button */}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={isUploading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                disabled={(files.length === 0 && !urlLink) || isUploading}
              >
                {isUploading ? "Uploading..." : "Upload Files"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

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
      const response = await fetch("/api/job-cards?status=unassigned&include_details=true");
      if (!response.ok) throw new Error("Failed to fetch job cards");
      const data = await response.json();
      console.log('Fetched jobCards:', data);
      return data;
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
      // Submit job to editor with comprehensive data
      // Note: Files are already uploaded via FileUploadModal component
      const submissionResponse = await apiRequest("POST", `/api/job-cards/${selectedJobId}/submit-to-editor`, {
        editorId: selectedEditorId,
        serviceBlocks: serviceBlocks.map(block => ({
          categoryId: block.categoryId,
          serviceName: block.service,
          selectedOptionId: block.selectedOptionId,
          selectedOptionName: block.selectedOptionName,
          selectedOptionPrice: block.selectedOptionPrice,
          quantity: block.quantity,
          instructions: block.instructions,
          exportType: block.exportType,
          customDescription: block.customDescription,
          fileCount: block.files.length
        })),
        instructions: jobData.instructions
      });

      return submissionResponse;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/job-cards"] });
      queryClient.invalidateQueries({ queryKey: ["/api/job-cards", selectedJobId] });
      toast({
        title: "Success",
        description: `Job submitted to editor successfully. Job ID: ${data.jobId}`,
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
                          {job.jobId ? `${job.jobId} - ` : ''}{job.booking?.propertyAddress || "No Address Available"} ({job.requestedServices?.join(', ')})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedJob && (
                    <div className="mt-3 p-3 bg-slate-50 rounded-md">
                      <p className="text-sm font-medium">Property: {selectedJob.booking?.propertyAddress || "No Address Available"}</p>
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
                                        const newServices = [...selectedServices, category.categoryName];
                                        handleServiceSelect(newServices);
                                      } else {
                                        const newServices = selectedServices.filter(s => s !== category.categoryName);
                                        handleServiceSelect(newServices);
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
                                      const targetBlock = serviceBlocks.find(block => block.service === category.categoryName);
                                      if (option && targetBlock) {
                                        updateServiceBlock(targetBlock.id, {
                                          selectedOptionId: option.id,
                                          selectedOptionName: option.optionName,
                                          selectedOptionPrice: parseFloat(option.price)
                                        });
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
                    <FileUploadModal
                      blockId={block.id}
                      onFilesUpload={(files) => updateServiceBlock(block.id, { files })}
                      uploadedFiles={block.files}
                    />
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
                    <span className="text-sm text-slate-500">final files expected to be delivered.</span>
                  </div>

                  {/* Instructions Section */}
                  <div className="space-y-2">
                    <Label>Instructions</Label>
                    <p className="text-sm text-slate-600 mb-3">
                      Offer detailed guidance as needed to help your supplier deliver the expected results for this service.
                    </p>
                    
                    {/* File Names and Instructions */}
                    <div className="space-y-2">
                      {block.fileEntries?.map((entry, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <Input
                            placeholder="File Name"
                            value={entry.fileName}
                            onChange={(e) => {
                              const newEntries = [...(block.fileEntries || [])];
                              newEntries[index] = { ...entry, fileName: e.target.value };
                              updateServiceBlock(block.id, { fileEntries: newEntries });
                            }}
                            className="flex-1"
                          />
                          <Input
                            placeholder="Detail your instruction"
                            value={entry.instruction}
                            onChange={(e) => {
                              const newEntries = [...(block.fileEntries || [])];
                              newEntries[index] = { ...entry, instruction: e.target.value };
                              updateServiceBlock(block.id, { fileEntries: newEntries });
                            }}
                            className="flex-[2]"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const newEntries = (block.fileEntries || []).filter((_, i) => i !== index);
                              updateServiceBlock(block.id, { fileEntries: newEntries });
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )) || (
                        <div className="flex items-center space-x-2">
                          <Input
                            placeholder="File Name"
                            value={block.fileName}
                            onChange={(e) => updateServiceBlock(block.id, { fileName: e.target.value })}
                            className="flex-1"
                          />
                          <Input
                            placeholder="Detail your instruction"
                            value={block.instructions}
                            onChange={(e) => updateServiceBlock(block.id, { instructions: e.target.value })}
                            className="flex-[2]"
                          />
                        </div>
                      )}
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const currentEntries = block.fileEntries || [];
                          const newEntries = [...currentEntries, { fileName: "", instruction: "" }];
                          updateServiceBlock(block.id, { fileEntries: newEntries });
                        }}
                        className="w-full"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Another File
                      </Button>
                    </div>
                  </div>

                  {/* Export Types */}
                  <div className="space-y-2">
                    <Label>Export Types</Label>
                    <p className="text-sm text-slate-600 mb-3">
                      Specify output requirements for your order, such as watermarks, folder sizes, and other preferences.
                    </p>
                    
                    <div className="space-y-2">
                      {block.exportEntries?.map((entry, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <Select 
                            value={entry.type} 
                            onValueChange={(value) => {
                              const newEntries = [...(block.exportEntries || [])];
                              newEntries[index] = { ...entry, type: value };
                              updateServiceBlock(block.id, { exportEntries: newEntries });
                            }}
                          >
                            <SelectTrigger className="flex-1">
                              <SelectValue placeholder="Choose Export Type" />
                            </SelectTrigger>
                            <SelectContent>
                              {exportTypes.map((type) => (
                                <SelectItem key={type} value={type}>
                                  {type}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            placeholder="Provide description"
                            value={entry.description}
                            onChange={(e) => {
                              const newEntries = [...(block.exportEntries || [])];
                              newEntries[index] = { ...entry, description: e.target.value };
                              updateServiceBlock(block.id, { exportEntries: newEntries });
                            }}
                            className="flex-[2]"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const newEntries = (block.exportEntries || []).filter((_, i) => i !== index);
                              updateServiceBlock(block.id, { exportEntries: newEntries });
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )) || (
                        <div className="flex items-center space-x-2">
                          <Select 
                            value={block.exportType} 
                            onValueChange={(value) => updateServiceBlock(block.id, { exportType: value })}
                          >
                            <SelectTrigger className="flex-1">
                              <SelectValue placeholder="Choose Export Type" />
                            </SelectTrigger>
                            <SelectContent>
                              {exportTypes.map((type) => (
                                <SelectItem key={type} value={type}>
                                  {type}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            placeholder="Provide description"
                            value={block.customDescription}
                            onChange={(e) => updateServiceBlock(block.id, { customDescription: e.target.value })}
                            className="flex-[2]"
                          />
                        </div>
                      )}
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const currentEntries = block.exportEntries || [];
                          const newEntries = [...currentEntries, { type: "", description: "" }];
                          updateServiceBlock(block.id, { exportEntries: newEntries });
                        }}
                        className="w-full"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Another Export Type
                      </Button>
                    </div>
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