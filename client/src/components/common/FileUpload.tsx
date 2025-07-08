import { useCallback, useState } from 'react';
import { Upload, X, FileImage, Video, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatFileSize } from '@/utils/formatting';
import { validateFileType, validateFileSize } from '@/utils/validation';
import { APP_CONFIG } from '@/utils/constants';

interface FileUploadProps {
  onFileSelect: (files: File[]) => void;
  accept?: string;
  maxSize?: number;
  multiple?: boolean;
  disabled?: boolean;
  className?: string;
}

export const FileUpload = ({
  onFileSelect,
  accept = "image/*,video/*,.pdf",
  maxSize = APP_CONFIG.MAX_FILE_SIZE,
  multiple = true,
  disabled = false,
  className,
}: FileUploadProps) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    handleFileSelection(files);
  }, [disabled]);

  const handleFileSelection = (files: File[]) => {
    const validFiles = files.filter(file => {
      if (!validateFileSize(file, maxSize)) {
        console.warn(`File ${file.name} is too large`);
        return false;
      }
      return true;
    });

    if (!multiple && validFiles.length > 1) {
      validFiles.splice(1);
    }

    setSelectedFiles(prev => multiple ? [...prev, ...validFiles] : validFiles);
    onFileSelect(validFiles);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      handleFileSelection(files);
    }
  };

  const removeFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
    onFileSelect(newFiles);
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <FileImage className="h-4 w-4" />;
    if (file.type.startsWith('video/')) return <Video className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  return (
    <div className={cn("space-y-4", className)}>
      <Card
        className={cn(
          "border-2 border-dashed transition-colors",
          dragActive && "border-primary bg-primary/5",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <CardContent className="p-6">
          <div
            className="flex flex-col items-center justify-center space-y-3"
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload className="h-10 w-10 text-gray-400" />
            <div className="text-center">
              <p className="text-sm font-medium">
                {multiple ? "Drop files here or click to upload" : "Drop file here or click to upload"}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Max file size: {formatFileSize(maxSize)}
              </p>
            </div>
            <input
              type="file"
              accept={accept}
              multiple={multiple}
              onChange={handleFileInput}
              disabled={disabled}
              className="hidden"
              id="file-upload"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              Browse Files
            </Button>
          </div>
        </CardContent>
      </Card>

      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Selected Files:</h4>
          {selectedFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center space-x-2">
                {getFileIcon(file)}
                <span className="text-sm font-medium">{file.name}</span>
                <span className="text-xs text-gray-500">({formatFileSize(file.size)})</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeFile(index)}
                disabled={disabled}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};