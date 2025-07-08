import { memo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Upload, Hash } from "lucide-react";
import { JobIdBadge } from "./JobIdBadge";

interface FileUploadWithJobIdProps {
  jobCardId: number;
  jobId: string | null;
  onFileUpload: (formData: FormData) => void;
  isUploading: boolean;
  triggerButton?: React.ReactNode;
}

export const FileUploadWithJobId = memo(({ 
  jobCardId, 
  jobId, 
  onFileUpload, 
  isUploading,
  triggerButton 
}: FileUploadWithJobIdProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    onFileUpload(formData);
  };

  const defaultTriggerButton = (
    <Button disabled={!jobId}>
      <Upload className="h-4 w-4 mr-2" />
      Upload Files
    </Button>
  );

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        {triggerButton || defaultTriggerButton}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Files</DialogTitle>
        </DialogHeader>
        
        {!jobId ? (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                  <div>
                    <p className="font-medium text-amber-900">Job ID Required</p>
                    <p className="text-sm text-amber-700">
                      A Job ID must be assigned before uploading files
                    </p>
                  </div>
                </div>
                
                <div className="text-center">
                  <JobIdBadge 
                    jobCardId={jobCardId} 
                    jobId={jobId} 
                    showAssignButton={true}
                  />
                </div>
                
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  className="w-full"
                >
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
              <Hash className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-700">
                Job ID: <strong>{jobId}</strong>
              </span>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Service Category</label>
              <Select name="serviceCategory" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="photography">Photography</SelectItem>
                  <SelectItem value="floor_plan">Floor Plans</SelectItem>
                  <SelectItem value="drone">Drone</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Files</label>
              <Input
                type="file"
                name="files"
                multiple
                accept="image/*,video/*,.pdf"
                required
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Instructions (Optional)</label>
              <Input
                name="instructions"
                placeholder="Any special instructions..."
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isUploading}>
                {isUploading ? "Uploading..." : "Upload"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
});

FileUploadWithJobId.displayName = "FileUploadWithJobId";