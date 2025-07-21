import { useState, useEffect } from "react";
import React from "react";
import { apiRequest } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Trash2, Upload, X, File, CheckCircle2, AlertCircle, LinkIcon } from "lucide-react";
import LoadingSpinner from "@/components/shared/loading-spinner";
import Sidebar from "@/components/layout/sidebar";
import TopBar from "@/components/layout/topbar";
import type { JobCard, Client, User, EditorServiceCategory, EditorServiceOption } from "@shared/schema";
import { editorServiceApi } from "@/lib/api/editorServiceApi";
import { uploadFileToFirebase, uploadMultipleFilesToFirebase } from "@/lib/firebaseUpload";
import { storage, auth } from '@/lib/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { signInWithCustomToken, signInAnonymously } from 'firebase/auth';

interface JobCardWithDetails extends JobCard {
  client: Client;
  photographer?: User | null;
  propertyAddress?: string;
}

interface ServiceBlock {
  id: string;
  categoryId: number;
  categoryName: string;
  selectedOptionId?: number;
  selectedOption?: EditorServiceOption;
  quantity: number;
  files: File[];
  instructions: string;
  exportType: string;
  customDescription?: string;
}

const exportTypes = [
  "Social Media",
  "Print",
  "Web",
  "Billboard",
  "Flyer",
  "Business Card",
  "Email Signature",
  "Website Hero",
  "Facebook Cover",
  "Instagram Post",
  "Instagram Story",
  "LinkedIn Banner",
  "Custom"
];

// File Upload Modal Component
function FileUploadModal({ 
  blockId, 
  uploadedFiles, 
  onFilesUpload, 
  onClose,
  jobCardId
}: { 
  blockId: string; 
  uploadedFiles: File[]; 
  onFilesUpload: (files: File[]) => void; 
  onClose: () => void;
  jobCardId: number;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<Map<string, number>>(new Map());
  const [uploadErrors, setUploadErrors] = useState<Map<string, string>>(new Map());
  const [dragActive, setDragActive] = useState(false);
  const [urlLink, setUrlLink] = useState("");

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

  const handleUpload = async () => {
    if (files.length === 0) return;
    
    setIsUploading(true);
    setUploadErrors(new Map());
    console.log(`Starting upload of ${files.length} files`);
    
    try {
      // Use client-side Firebase upload
      console.log('🔥 Using client-side Firebase upload...');
      
      // Check authentication before upload 
      const user = auth.currentUser;
      console.log('Auth state:', { userId: user?.uid, isAuthenticated: !!user });
      
      if (!user) {
        throw new Error('No authenticated user - login required for uploads');
      }
      
      const uploadResults: any[] = [];
      const uploadTasks = files.map(file => {
        try {
          const path = `temp_uploads/${jobCardId}/${file.name}`;
          const storageRef = ref(storage, path);
          console.log('Starting upload task for', file.name);
          const uploadTask = uploadBytesResumable(storageRef, file);
          
          uploadTask.on('state_changed', 
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setUploadingFiles(prev => new Map(prev).set(file.name, progress));
              console.log(`📤 ${file.name}: ${progress.toFixed(1)}%`);
            }, 
            (error) => {
              console.error('Firebase upload error:', error.code, error.message);
              if (error.code === 'storage/canceled') {
                setUploadErrors(prev => new Map(prev).set(file.name, 'Upload canceled - check network or try again'));
              } else {
                setUploadErrors(prev => new Map(prev).set(file.name, error.message || 'Upload failed'));
              }
            }, 
            async () => {
              try {
                const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
                uploadResults.push({ 
                  fileName: file.name, 
                  firebasePath: path, 
                  downloadUrl 
                });
                console.log(`✅ ${file.name} uploaded successfully`);
              } catch (error) {
                console.error('Error getting download URL:', error);
                setUploadErrors(prev => new Map(prev).set(file.name, 'Failed to get download URL'));
              }
            }
          );
          
          // Add timeout to prevent hanging uploads (60 seconds for large files)
          const timeoutId = setTimeout(() => {
            const currentProgress = uploadingFiles.get(file.name) || 0;
            if (!uploadingFiles.has(file.name) || currentProgress === 0) {
              console.error(`Upload timeout for ${file.name} - no progress after 60s`);
              setUploadErrors(prev => new Map(prev).set(file.name, 'Upload timed out - no progress'));
              uploadTask.cancel();
            }
          }, 60000);
          
          // Clear timeout when upload completes
          uploadTask.then(() => clearTimeout(timeoutId));
          
          return uploadTask;
        } catch (syncError) {
          console.error('Sync upload error:', syncError);
          setUploadErrors(prev => new Map(prev).set(file.name, syncError.message || 'Upload initialization failed'));
          throw syncError;
        }
      });
      
      // Wait for all uploads to complete
      await Promise.all(
        uploadTasks.map(task => 
          new Promise((resolve, reject) => {
            task.on('state_changed', null, reject, resolve);
          })
        )
      );
      
      console.log('All files uploaded successfully:', uploadResults);
      
      // Clear progress tracking
      setUploadingFiles(new Map());
      
      // Add files to uploaded files
      onFilesUpload([...uploadedFiles, ...files]);
      
      setFiles([]);
      setUrlLink("");
      
      // Show success toast
      toast({
        title: "Upload Successful",
        description: `Successfully uploaded ${uploadResults.length} file(s) to Firebase`,
      });
      
      // Close modal after successful upload
      setTimeout(() => onClose(), 1000);
    } catch (error) {
      console.error('Firebase upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Check if there are specific file upload errors
      const uploadErrorsList = Array.from(uploadErrors.entries());
      const errorDetails = uploadErrorsList.length > 0 
        ? `Errors: ${uploadErrorsList.map(([file, err]) => `${file}: ${err}`).join(', ')}`
        : errorMessage;
      
      // Show error toast with specific details
      const hasCanceledOrTimeout = uploadErrorsList.some(([, err]) => 
        err.includes('canceled') || err.includes('timed out')
      );
      
      toast({
        title: "Upload Failed",
        description: hasCanceledOrTimeout 
          ? "Upload interrupted - retry or check connection"
          : `Failed to upload files: ${errorDetails}`,
        variant: "destructive"
      });
      
      // Clear any partial progress
      setUploadingFiles(new Map());
    } finally {
      setIsUploading(false);
    }
  };

  return (
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
              onClick={onClose}
              disabled={isUploading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* URL Input */}
        <div className="mb-4">
          <div className="flex gap-2">
            <Input
              placeholder="Or paste a link to files"
              value={urlLink}
              onChange={(e) => setUrlLink(e.target.value)}
              disabled={isUploading}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (urlLink) {
                  // For now, just add as a placeholder
                  toast({
                    title: "Link Added",
                    description: "File links will be processed during submission",
                  });
                }
              }}
              disabled={!urlLink || isUploading}
            >
              <LinkIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Drag and Drop Area */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center mb-4 transition-colors
            ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
            ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <Upload className="mx-auto h-12 w-12 text-gray-400 mb-2" />
          <p className="text-sm text-gray-600">
            Drag and drop files here, or click to select
          </p>
          <input
            id={`file-input-${blockId}`}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileInput}
            accept=".jpg,.jpeg,.png,.mp4,.mov,.avi,.dng,.cr2,.nef,.arw,.tiff,.zip"
            disabled={isUploading}
          />
        </div>

        {/* Files List */}
        {(files.length > 0 || uploadedFiles.length > 0) && (
          <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
            {/* Pending files */}
            {files.map((file, index) => (
              <div key={`pending-${index}`} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <File className="h-4 w-4 text-gray-500 flex-shrink-0" />
                  <span className="text-sm truncate">{file.name}</span>
                  <span className="text-xs text-gray-500">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                </div>
                {uploadingFiles.has(file.name) ? (
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadingFiles.get(file.name)}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-600">{uploadingFiles.get(file.name)}%</span>
                  </div>
                ) : uploadErrors.has(file.name) ? (
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <span className="text-xs text-red-500">{uploadErrors.get(file.name)}</span>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(index)}
                    disabled={isUploading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            
            {/* Uploaded files */}
            {uploadedFiles.map((file, index) => (
              <div key={`uploaded-${index}`} className="flex items-center justify-between p-2 bg-green-50 rounded">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm">{file.name}</span>
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
          </div>
        )}

        {/* Upload Button */}
        {files.length > 0 && (
          <Button
            className="w-full"
            onClick={handleUpload}
            disabled={isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload {files.length} file{files.length > 1 ? 's' : ''}
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

// Service Block Component
function ServiceBlockComponent({ 
  block, 
  editorOptions,
  onUpdate, 
  onRemove,
  jobCardId 
}: { 
  block: ServiceBlock;
  editorOptions: EditorServiceOption[];
  onUpdate: (block: ServiceBlock) => void;
  onRemove: () => void;
  jobCardId: number;
}) {
  const [showUploadModal, setShowUploadModal] = useState(false);

  const updateFiles = (files: File[]) => {
    onUpdate({ ...block, files });
  };

  return (
    <Card className="mb-4">
      <CardContent className="pt-4">
        <div className="flex justify-between items-start mb-4">
          <h4 className="font-medium">{block.categoryName}</h4>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemove}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4">
          {/* Pricing Option */}
          {editorOptions.length > 0 && (
            <div>
              <Label>Pricing Option</Label>
              <Select
                value={block.selectedOptionId?.toString() || ""}
                onValueChange={(value) => {
                  const option = editorOptions.find(opt => opt.id === parseInt(value));
                  onUpdate({ ...block, selectedOptionId: parseInt(value), selectedOption: option });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select pricing option" />
                </SelectTrigger>
                <SelectContent>
                  {editorOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id.toString()}>
                      {option.optionName} - ${option.price}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Quantity */}
          <div>
            <Label>Quantity</Label>
            <Input
              type="number"
              min="1"
              value={block.quantity}
              onChange={(e) => onUpdate({ ...block, quantity: parseInt(e.target.value) || 1 })}
            />
          </div>

          {/* Files */}
          <div>
            <Label>Files ({block.files.length})</Label>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              Upload
            </Button>
          </div>

          {/* Export Type */}
          <div>
            <Label>Export Type</Label>
            <Select
              value={block.exportType}
              onValueChange={(value) => onUpdate({ ...block, exportType: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select export type" />
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

          {/* Custom Description for Custom export type */}
          {block.exportType === "Custom" && (
            <div>
              <Label>Custom Export Description</Label>
              <Input
                placeholder="Describe the custom export requirements"
                value={block.customDescription || ""}
                onChange={(e) => onUpdate({ ...block, customDescription: e.target.value })}
              />
            </div>
          )}

          {/* Instructions */}
          <div>
            <Label>Instructions</Label>
            <Textarea
              placeholder="Add any specific instructions for this service"
              value={block.instructions}
              onChange={(e) => onUpdate({ ...block, instructions: e.target.value })}
              rows={3}
            />
          </div>
        </div>
      </CardContent>

      {showUploadModal && (
        <FileUploadModal
          blockId={block.id}
          uploadedFiles={block.files}
          onFilesUpload={updateFiles}
          onClose={() => setShowUploadModal(false)}
          jobCardId={jobCardId}
        />
      )}
    </Card>
  );
}

function UploadToEditorContent() {
  const [selectedJob, setSelectedJob] = useState<JobCardWithDetails | null>(null);
  const [selectedEditor, setSelectedEditor] = useState<string | null>(null);
  const [serviceBlocks, setServiceBlocks] = useState<ServiceBlock[]>([]);
  const [instructions, setInstructions] = useState("");
  const [loading, setLoading] = useState(false);
  const [jobCards, setJobCards] = useState<JobCardWithDetails[]>([]);
  const [editors, setEditors] = useState<User[]>([]);
  const [editorCategories, setEditorCategories] = useState<EditorServiceCategory[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<Set<number>>(new Set());

  // Load initial data
  React.useEffect(() => {
    const loadData = async () => {
      try {
        // Load job cards with booking details
        const jobsResponse = await apiRequest('GET', '/api/job-cards');
        const filteredJobs = jobsResponse.filter((job: any) => 
          job.status === 'unassigned' || 
          job.status === 'pending' ||
          job.status === 'in_progress' || 
          job.status === 'editing'
        );
        
        // Get property address from booking data for each job
        const jobsWithAddress = await Promise.all(filteredJobs.map(async (job: any) => {
          try {
            const bookingResponse = await apiRequest('GET', `/api/bookings/${job.bookingId}`);
            return {
              ...job,
              propertyAddress: bookingResponse.propertyAddress || 'No address'
            };
          } catch (error) {
            return {
              ...job,
              propertyAddress: 'No address'
            };
          }
        }));
        
        setJobCards(jobsWithAddress);

        // Load editors
        const editorsResponse = await apiRequest('GET', '/api/editors');
        setEditors(editorsResponse);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    loadData();
  }, []);

  // Load editor services when editor is selected
  React.useEffect(() => {
    if (selectedEditor) {
      const loadEditorServices = async () => {
        try {
          console.log('Loading services for editor:', selectedEditor);
          const categories = await editorServiceApi.getEditorServices(selectedEditor);
          console.log('Loaded editor categories:', categories);
          setEditorCategories(categories);
        } catch (error) {
          console.error('Error loading editor services:', error);
        }
      };

      loadEditorServices();
    } else {
      setEditorCategories([]);
    }
  }, [selectedEditor]);

  const handleCategoryToggle = (categoryId: number, category: EditorServiceCategory) => {
    const newSelectedCategories = new Set(selectedCategories);
    
    if (newSelectedCategories.has(categoryId)) {
      newSelectedCategories.delete(categoryId);
      // Remove service block for this category
      setServiceBlocks(blocks => blocks.filter(block => block.categoryId !== categoryId));
    } else {
      newSelectedCategories.add(categoryId);
      // Add service block for this category
      const newBlock: ServiceBlock = {
        id: `block-${Date.now()}`,
        categoryId: categoryId,
        categoryName: category.categoryName,
        quantity: 1,
        files: [],
        instructions: "",
        exportType: ""
      };
      setServiceBlocks(blocks => [...blocks, newBlock]);
    }
    
    setSelectedCategories(newSelectedCategories);
  };

  const updateServiceBlock = (blockId: string, updatedBlock: ServiceBlock) => {
    setServiceBlocks(blocks => 
      blocks.map(block => block.id === blockId ? updatedBlock : block)
    );
  };

  const removeServiceBlock = (blockId: string, categoryId: number) => {
    setServiceBlocks(blocks => blocks.filter(block => block.id !== blockId));
    setSelectedCategories(cats => {
      const newCats = new Set(cats);
      newCats.delete(categoryId);
      return newCats;
    });
  };

  const handleSubmit = async () => {
    if (!selectedJob || !selectedEditor || serviceBlocks.length === 0) {
      toast({
        title: "Incomplete Form",
        description: "Please select a job, editor, and at least one service",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Submit to editor
      await apiRequest('POST', `/api/job-cards/${selectedJob.id}/submit-to-editor`, {
        editorId: selectedEditor,
        serviceBlocks: serviceBlocks.map(block => ({
          categoryId: block.categoryId,
          optionId: block.selectedOptionId,
          quantity: block.quantity,
          instructions: block.instructions,
          exportType: block.exportType,
          customDescription: block.customDescription
        })),
        instructions
      });

      toast({
        title: "Success",
        description: "Job has been submitted to the editor",
      });

      // Refresh job list to reflect any status changes
      const jobsResponse = await apiRequest('GET', '/api/job-cards');
      const filteredJobs = jobsResponse.filter((job: any) => 
        job.status === 'unassigned' || 
        job.status === 'pending' ||
        job.status === 'in_progress' || 
        job.status === 'editing'
      );
      
      // Get property address from booking data for each job
      const jobsWithAddress = await Promise.all(filteredJobs.map(async (job: any) => {
        try {
          const bookingResponse = await apiRequest('GET', `/api/bookings/${job.bookingId}`);
          return {
            ...job,
            propertyAddress: bookingResponse.propertyAddress || 'No address'
          };
        } catch (error) {
          return {
            ...job,
            propertyAddress: 'No address'
          };
        }
      }));
      
      setJobCards(jobsWithAddress);

      // Reset form but keep job selected to allow multiple uploads to same job
      // setSelectedJob(null); // Don't reset job selection
      setSelectedEditor(null);
      setServiceBlocks([]);
      setInstructions("");
      setSelectedCategories(new Set());
    } catch (error) {
      console.error('Error submitting to editor:', error);
      toast({
        title: "Error",
        description: "Failed to submit job to editor",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 ml-64 overflow-auto">
        <TopBar title="Upload to Editor" />
        <div className="container mx-auto p-6 max-w-4xl">
          <h1 className="text-3xl font-bold mb-8">Upload to Editor</h1>

      {/* Step 1: Select Job */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Step 1: Select Job</CardTitle>
          <CardDescription>Choose a job to send to an editor</CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedJob?.id.toString() || ""}
            onValueChange={(value) => {
              const job = jobCards.find(j => j.id.toString() === value);
              setSelectedJob(job || null);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a job" />
            </SelectTrigger>
            <SelectContent>
              {jobCards.map((job) => (
                <SelectItem key={job.id} value={job.id.toString()}>
                  Job {job.jobId || job.id} - {job.client.name} - {job.propertyAddress || 'No address'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Step 2: Select Editor */}
      {selectedJob && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Step 2: Select Editor</CardTitle>
            <CardDescription>Choose an editor to handle this job</CardDescription>
          </CardHeader>
          <CardContent>
            <Select
              value={selectedEditor || ""}
              onValueChange={(value) => {
                console.log('Selected editor:', value);
                setSelectedEditor(value);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an editor" />
              </SelectTrigger>
              <SelectContent>
                {editors.map((editor) => (
                  <SelectItem key={editor.id} value={editor.id.toString()}>
                    {editor.firstName || editor.lastName ? 
                      `${editor.firstName || ''} ${editor.lastName || ''}`.trim() : 
                      editor.email
                    }
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Select Services */}
      {selectedEditor && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Step 3: Select Services</CardTitle>
            <CardDescription>Choose the services you need from this editor</CardDescription>
          </CardHeader>
          <CardContent>
            {editorCategories.length === 0 ? (
              <p className="text-gray-500">This editor has not set up any services yet.</p>
            ) : (
              <div className="space-y-4">
                {editorCategories.map((category) => (
                  <Card key={category.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{category.categoryName}</h4>
                      </div>
                      <input
                        type="checkbox"
                        checked={selectedCategories.has(category.id)}
                        onChange={() => handleCategoryToggle(category.id, category)}
                        className="h-4 w-4 text-blue-600"
                      />
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 4: Service Details */}
      {serviceBlocks.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Step 4: Service Details</CardTitle>
            <CardDescription>Configure each selected service</CardDescription>
          </CardHeader>
          <CardContent>
            {serviceBlocks.map((block) => {
              const category = editorCategories.find(cat => cat.id === block.categoryId);
              const options: EditorServiceOption[] = [];
              
              return (
                <ServiceBlockComponent
                  key={block.id}
                  block={block}
                  editorOptions={options}
                  onUpdate={(updatedBlock) => updateServiceBlock(block.id, updatedBlock)}
                  onRemove={() => removeServiceBlock(block.id, block.categoryId)}
                  jobCardId={selectedJob?.id || 0}
                />
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* General Instructions */}
      {serviceBlocks.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>General Instructions</CardTitle>
            <CardDescription>Any additional instructions for the editor</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Add any general instructions or notes for the editor..."
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={4}
            />
          </CardContent>
        </Card>
      )}

      {/* Submit Button */}
      {serviceBlocks.length > 0 && (
        <Button
          className="w-full"
          size="lg"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            "Submit to Editor"
          )}
        </Button>
      )}
        </div>
      </div>
    </div>
  );
}

export default function UploadToEditor() {
  const { isAuthenticated, isLoading } = useAuth();

  // Integrate Firebase Auth with existing useAuth
  useEffect(() => {
    if (isAuthenticated && !auth.currentUser) {
      // For now, sign in anonymously to enable uploads
      // TODO: Replace with custom token from backend auth system
      signInAnonymously(auth)
        .then((result) => {
          console.log('Firebase anonymous sign-in successful:', result.user.uid);
        })
        .catch((err) => {
          console.error('Firebase auth failed:', err);
        });
    }
  }, [isAuthenticated]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    window.location.href = "/api/login";
    return null;
  }

  return <UploadToEditorContent />;
}