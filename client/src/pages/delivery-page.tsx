import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Download, 
  Eye, 
  MapPin, 
  Calendar,
  Clock,
  FileText,
  Video,
  Home,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  Image as ImageIcon,
  Camera
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DeliveryData {
  jobCard: {
    id: number;
    jobId: string;
    requestedServices: string[];
    status: string;
    client: {
      id: number;
      name: string;
      contactName: string;
    };
    booking?: {
      propertyAddress: string;
      scheduledDate: string;
      scheduledTime: string;
    };
    deliverySettings?: {
      headerImageFileId?: number;
      enableComments: boolean;
      enableDownloads: boolean;
      customMessage?: string;
    };
  };
  files: Array<{
    id: number;
    fileName: string;
    originalName: string;
    mediaType: string;
    serviceCategory?: string;
    url: string;
  }>;
}

interface DeliveryComment {
  id: number;
  clientName: string;
  clientEmail: string;
  comment: string;
  requestRevision: boolean;
  adminResponse?: string;
  status: string;
  createdAt: string;
  respondedAt?: string;
}

export default function DeliveryPage() {
  const { jobCardId } = useParams<{ jobCardId: string }>();
  const [data, setData] = useState<DeliveryData | null>(null);
  const [comments, setComments] = useState<DeliveryComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<number>>(new Set());
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const { toast } = useToast();

  // Comment form state
  const [commentForm, setCommentForm] = useState({
    clientName: "",
    clientEmail: "",
    comment: "",
    requestRevision: false,
  });

  useEffect(() => {
    if (jobCardId) {
      fetchDeliveryData();
    }
  }, [jobCardId]);

  const fetchDeliveryData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/delivery/${jobCardId}`);
      
      if (!response.ok) {
        throw new Error("Failed to load delivery page");
      }
      
      const deliveryData = await response.json();
      setData(deliveryData);
      
      // Fetch comments
      const commentsResponse = await fetch(`/api/delivery/${jobCardId}/comments`);
      if (commentsResponse.ok) {
        const commentsData = await commentsResponse.json();
        setComments(commentsData);
      }
    } catch (error) {
      console.error("Error fetching delivery data:", error);
      toast({
        title: "Error",
        description: "Failed to load delivery page",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (file?: { id: number; fileName: string }) => {
    try {
      // Track download
      await fetch(`/api/delivery/${jobCardId}/download`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileName: file?.fileName || null,
          fileType: file ? file.fileName.split('.').pop() : "bulk",
        }),
      });

      if (file) {
        // Single file download
        window.open(file.fileName, '_blank');
        toast({
          title: "Download started",
          description: `Downloading ${file.fileName}`,
        });
      } else {
        // Bulk download - would need to implement zip creation on backend
        toast({
          title: "Bulk download",
          description: "Preparing files for download...",
        });
      }
    } catch (error) {
      console.error("Download error:", error);
      toast({
        title: "Download failed",
        description: "Could not download file(s)",
        variant: "destructive",
      });
    }
  };

  const handleSubmitComment = async () => {
    if (!commentForm.clientName || !commentForm.clientEmail || !commentForm.comment) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmittingComment(true);
      const response = await fetch(`/api/delivery/${jobCardId}/comment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(commentForm),
      });

      if (!response.ok) {
        throw new Error("Failed to submit comment");
      }

      const newComment = await response.json();
      setComments([newComment, ...comments]);
      setCommentForm({
        clientName: "",
        clientEmail: "",
        comment: "",
        requestRevision: false,
      });

      toast({
        title: "Comment submitted",
        description: commentForm.requestRevision 
          ? "Your revision request has been sent to the team"
          : "Thank you for your feedback!",
      });
    } catch (error) {
      console.error("Comment submission error:", error);
      toast({
        title: "Failed to submit",
        description: "Could not submit your comment",
        variant: "destructive",
      });
    } finally {
      setSubmittingComment(false);
    }
  };

  const toggleFileSelection = (fileId: number) => {
    const newSelection = new Set(selectedFiles);
    if (newSelection.has(fileId)) {
      newSelection.delete(fileId);
    } else {
      newSelection.add(fileId);
    }
    setSelectedFiles(newSelection);
  };

  const selectAllFiles = () => {
    if (data) {
      setSelectedFiles(new Set(data.files.map(f => f.id)));
    }
  };

  const clearSelection = () => {
    setSelectedFiles(new Set());
  };

  const getFilesByCategory = (category: string) => {
    if (!data) return [];
    return data.files.filter(f => {
      if (category === 'photos') return f.mediaType === 'image' || f.serviceCategory === 'photography';
      if (category === 'floor_plans') return f.serviceCategory === 'floor_plans';
      if (category === 'video') return f.mediaType === 'video' || f.serviceCategory === 'video';
      if (category === 'virtual_tour') return f.serviceCategory === 'virtual_tour';
      return f.serviceCategory === 'other' || !f.serviceCategory;
    });
  };

  const getHeaderImage = () => {
    if (!data) return null;
    const photos = getFilesByCategory('photos');
    if (data.jobCard.deliverySettings?.headerImageFileId) {
      return photos.find(f => f.id === data.jobCard.deliverySettings?.headerImageFileId);
    }
    return photos[0] || null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your media...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Delivery Page Not Found</h1>
          <p className="text-gray-600">The requested delivery page could not be found.</p>
        </div>
      </div>
    );
  }

  const headerImage = getHeaderImage();
  const photos = getFilesByCategory('photos');
  const floorPlans = getFilesByCategory('floor_plans');
  const videos = getFilesByCategory('video');
  const virtualTours = getFilesByCategory('virtual_tour');
  const otherFiles = getFilesByCategory('other');

  // Get section order and visibility from delivery settings
  const deliverySettings = data?.jobCard.deliverySettings;
  const sectionOrder = deliverySettings?.sectionOrder || ['photos', 'floor_plans', 'video', 'virtual_tour', 'other_files'];
  const sectionVisibility = deliverySettings?.sectionVisibility || {
    photos: true,
    floor_plans: true,
    video: true,
    virtual_tour: true,
    other_files: true
  };

  // Function to render each section based on type
  const renderSection = (sectionType: string) => {
    if (!sectionVisibility[sectionType]) return null;

    const sectionData = {
      photos: { files: photos, title: "Photos", icon: Camera },
      floor_plans: { files: floorPlans, title: "Floor Plans", icon: Home },
      video: { files: videos, title: "Video", icon: Video },
      virtual_tour: { files: virtualTours, title: "Virtual Tour", icon: Camera },
      other_files: { files: otherFiles, title: "Other Files", icon: FileText }
    };

    const section = sectionData[sectionType as keyof typeof sectionData];
    if (!section || section.files.length === 0) return null;

    const Icon = section.icon;

    return (
      <section key={sectionType} className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          <Icon className="h-6 w-6 mr-2" />
          {section.title}
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {section.files.map((file) => (
            <Card key={file.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="aspect-[4/3] bg-gray-200 relative group">
                {file.mediaType === 'image' ? (
                  <img 
                    src={file.url} 
                    alt={file.originalName}
                    className="w-full h-full object-cover cursor-pointer"
                    onClick={() => setViewingImage(file.url)}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100">
                    <Icon className="h-12 w-12 text-gray-400" />
                  </div>
                )}
                
                {/* Hover overlay for selection */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setViewingImage(file.url)}
                      className="mr-2"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {data.jobCard.deliverySettings?.enableDownloads && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleDownload(file)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 truncate">{file.originalName}</h3>
                    <p className="text-sm text-gray-500">{file.mediaType}</p>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-2">
                    <Checkbox
                      checked={selectedFiles.has(file.id)}
                      onCheckedChange={() => toggleFileSelection(file.id)}
                      className="h-4 w-4"
                    />
                    {data.jobCard.deliverySettings?.enableDownloads && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownload(file)}
                        className="h-8 w-8 p-0"
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Banner */}
      {headerImage && (
        <div className="relative h-64 md:h-80 lg:h-96 bg-gray-900 overflow-hidden">
          <img 
            src={headerImage.url} 
            alt="Property header"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black bg-opacity-40 flex items-end">
            <div className="container mx-auto px-4 py-8 text-white">
              <h1 className="text-3xl md:text-4xl font-bold mb-2">
                {data.jobCard.booking?.propertyAddress || "Property Media Delivery"}
              </h1>
              <div className="flex items-center space-x-4 text-lg">
                <div className="flex items-center">
                  <MapPin className="h-5 w-5 mr-2" />
                  {data.jobCard.client.name}
                </div>
                {data.jobCard.booking && (
                  <div className="flex items-center">
                    <Calendar className="h-5 w-5 mr-2" />
                    {new Date(data.jobCard.booking.scheduledDate).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Custom Message */}
        {data.jobCard.deliverySettings?.customMessage && (
          <Card className="mb-8">
            <CardContent className="pt-6">
              <p className="text-lg text-gray-700">{data.jobCard.deliverySettings.customMessage}</p>
            </CardContent>
          </Card>
        )}

        {/* Dynamic Sections Based on Custom Order */}
        {sectionOrder.map(sectionType => renderSection(sectionType))}

        {/* Legacy Photos Section - Disabled */}
        {false && photos.length > 0 && (
          <section className="mb-12">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                <Camera className="h-6 w-6 mr-2" />
                Photos ({photos.length})
              </h2>
              {data.jobCard.deliverySettings?.enableDownloads && (
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={selectAllFiles}
                  >
                    Select All
                  </Button>
                  {selectedFiles.size > 0 && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearSelection}
                      >
                        Clear ({selectedFiles.size})
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleDownload()}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download Selected
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {photos.map((file) => (
                <div key={file.id} className="relative group">
                  <div className="aspect-square bg-gray-200 rounded-lg overflow-hidden">
                    <img 
                      src={file.url} 
                      alt={file.originalName}
                      className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                      onClick={() => setViewingImage(file.url)}
                    />
                  </div>
                  
                  {data.jobCard.deliverySettings?.enableDownloads && (
                    <div className="absolute top-2 left-2">
                      <Checkbox
                        checked={selectedFiles.has(file.id)}
                        onCheckedChange={() => toggleFileSelection(file.id)}
                        className="bg-white border-2"
                      />
                    </div>
                  )}
                  
                  <div className="absolute inset-x-0 bottom-0 bg-black bg-opacity-50 text-white p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex justify-between items-center">
                      <span className="text-sm truncate">{file.originalName}</span>
                      <div className="flex space-x-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-white hover:bg-white hover:bg-opacity-20"
                          onClick={() => setViewingImage(file.url)}
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        {data.jobCard.deliverySettings?.enableDownloads && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 text-white hover:bg-white hover:bg-opacity-20"
                            onClick={() => handleDownload(file)}
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Legacy Floor Plans Section - Disabled */}
        {false && floorPlans.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <Home className="h-6 w-6 mr-2" />
              Floor Plans
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {floorPlans.map((file) => (
                <Card key={file.id} className="overflow-hidden">
                  <div className="aspect-[4/3] bg-gray-200">
                    <img 
                      src={file.url} 
                      alt={file.originalName}
                      className="w-full h-full object-contain cursor-pointer"
                      onClick={() => setViewingImage(file.url)}
                    />
                  </div>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <h3 className="font-medium">{file.originalName}</h3>
                      {data.jobCard.deliverySettings?.enableDownloads && (
                        <Button
                          size="sm"
                          onClick={() => handleDownload(file)}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Legacy Video Section - Disabled */}
        {false && videos.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <Video className="h-6 w-6 mr-2" />
              Videos
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {videos.map((file) => (
                <Card key={file.id}>
                  <CardContent className="p-4">
                    <div className="aspect-video bg-gray-200 rounded-lg mb-4">
                      <video 
                        src={file.url} 
                        controls
                        className="w-full h-full rounded-lg"
                      />
                    </div>
                    <div className="flex justify-between items-center">
                      <h3 className="font-medium">{file.originalName}</h3>
                      {data.jobCard.deliverySettings?.enableDownloads && (
                        <Button
                          size="sm"
                          onClick={() => handleDownload(file)}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Legacy Other Files Section - Disabled */}
        {false && otherFiles.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <FileText className="h-6 w-6 mr-2" />
              Other Files
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {otherFiles.map((file) => (
                <Card key={file.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <FileText className="h-8 w-8 text-gray-400" />
                        <div>
                          <h3 className="font-medium truncate">{file.originalName}</h3>
                          <p className="text-sm text-gray-500">{file.fileName.split('.').pop()?.toUpperCase()}</p>
                        </div>
                      </div>
                      {data.jobCard.deliverySettings?.enableDownloads && (
                        <Button
                          size="sm"
                          onClick={() => handleDownload(file)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Comments Section */}
        {data.jobCard.deliverySettings?.enableComments && (
          <section className="mb-12">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MessageSquare className="h-5 w-5 mr-2" />
                  Feedback & Comments
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Comment Form */}
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="clientName">Your Name *</Label>
                      <Input
                        id="clientName"
                        value={commentForm.clientName}
                        onChange={(e) => setCommentForm({ ...commentForm, clientName: e.target.value })}
                        placeholder="Enter your name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="clientEmail">Email Address *</Label>
                      <Input
                        id="clientEmail"
                        type="email"
                        value={commentForm.clientEmail}
                        onChange={(e) => setCommentForm({ ...commentForm, clientEmail: e.target.value })}
                        placeholder="Enter your email"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="comment">Your Message *</Label>
                    <Textarea
                      id="comment"
                      value={commentForm.comment}
                      onChange={(e) => setCommentForm({ ...commentForm, comment: e.target.value })}
                      placeholder="Share your feedback or request revisions..."
                      rows={4}
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="requestRevision"
                      checked={commentForm.requestRevision}
                      onCheckedChange={(checked) => setCommentForm({ ...commentForm, requestRevision: !!checked })}
                    />
                    <Label htmlFor="requestRevision" className="text-sm">
                      This is a revision request
                    </Label>
                  </div>
                  
                  <Button
                    onClick={handleSubmitComment}
                    disabled={submittingComment}
                    className="w-full md:w-auto"
                  >
                    {submittingComment ? "Submitting..." : "Submit Feedback"}
                  </Button>
                </div>

                {/* Existing Comments */}
                {comments.length > 0 && (
                  <div className="space-y-4 pt-6 border-t">
                    <h3 className="font-medium text-gray-900">Previous Comments</h3>
                    {comments.map((comment) => (
                      <div key={comment.id} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-medium">{comment.clientName}</p>
                            <p className="text-sm text-gray-500">
                              {new Date(comment.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          {comment.requestRevision && (
                            <Badge variant="destructive">Revision Request</Badge>
                          )}
                        </div>
                        <p className="text-gray-700 mb-3">{comment.comment}</p>
                        
                        {comment.adminResponse && (
                          <div className="bg-blue-50 rounded p-3 border-l-4 border-blue-400">
                            <p className="font-medium text-blue-900 mb-1">Team Response:</p>
                            <p className="text-blue-800">{comment.adminResponse}</p>
                            <p className="text-sm text-blue-600 mt-1">
                              {comment.respondedAt && new Date(comment.respondedAt).toLocaleDateString()}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        )}
      </div>

      {/* Image Viewer Modal */}
      {viewingImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
          onClick={() => setViewingImage(null)}
        >
          <div className="relative max-w-full max-h-full">
            <img 
              src={viewingImage} 
              alt="Full size view"
              className="max-w-full max-h-full object-contain"
            />
            <Button
              variant="secondary"
              size="sm"
              className="absolute top-4 right-4"
              onClick={() => setViewingImage(null)}
            >
              Close
            </Button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="container mx-auto px-4 text-center">
          <h3 className="text-lg font-semibold mb-2">RealEstate Media Pro</h3>
          <p className="text-gray-400">Professional Real Estate Media Services</p>
          <p className="text-sm text-gray-500 mt-4">
            Job ID: {data.jobCard.jobId}
          </p>
        </div>
      </footer>
    </div>
  );
}