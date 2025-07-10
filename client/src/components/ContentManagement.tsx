import { memo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Image, 
  Video, 
  FileText, 
  Download, 
  CheckCircle, 
  DollarSign,
  Clock,
  User,
  FileCheck,
  AlertCircle
} from "lucide-react";

interface ContentPiece {
  id: string;
  jobId: string;
  fileName: string;
  serviceCategory: string;
  mediaType: string;
  cost: number;
  completedBy: string;
  completedAt: string;
  metadata: {
    editorName: string;
    qcStatus: string;
    instructionsFollowed: string;
    qcIssues: string;
  };
}

interface ContentManagementProps {
  jobId: string;
  contentPieces: ContentPiece[];
  finalCost: number;
  completionTimestamp: string;
  editorName: string;
  instructionsFollowed: string;
  qcIssues: string;
}

const ContentManagement = memo(({ 
  jobId, 
  contentPieces, 
  finalCost, 
  completionTimestamp, 
  editorName, 
  instructionsFollowed, 
  qcIssues 
}: ContentManagementProps) => {
  const [selectedSection, setSelectedSection] = useState("all");

  const getSectionIcon = (category: string) => {
    switch (category) {
      case "photography":
        return <Image className="h-5 w-5" />;
      case "video":
        return <Video className="h-5 w-5" />;
      case "floor_plans":
        return <FileText className="h-5 w-5" />;
      default:
        return <FileCheck className="h-5 w-5" />;
    }
  };

  const getSectionColor = (category: string) => {
    switch (category) {
      case "photography":
        return "bg-blue-100 text-blue-800";
      case "video":
        return "bg-purple-100 text-purple-800";
      case "floor_plans":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getContentByCategory = (category: string) => {
    if (category === "all") return contentPieces;
    return contentPieces.filter(piece => piece.serviceCategory === category);
  };

  const categories = ["all", ...new Set(contentPieces.map(p => p.serviceCategory))];

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-orange-100 p-2 rounded-lg">
            <Badge className="bg-orange-500 text-white font-medium">
              #{jobId}
            </Badge>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Manage Content</h2>
            <p className="text-gray-600">Manage your delivery-ready media in a way that works for you.</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-green-600 border-green-600">
            <CheckCircle className="h-4 w-4 mr-1" />
            Ready for Delivery
          </Badge>
        </div>
      </div>

      {/* Content Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Content Pieces</p>
                <p className="text-2xl font-bold text-gray-900">{contentPieces.length}</p>
              </div>
              <FileCheck className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Final Edit Cost</p>
                <p className="text-2xl font-bold text-gray-900">${finalCost.toFixed(2)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed By</p>
                <p className="text-lg font-semibold text-gray-900">{editorName}</p>
              </div>
              <User className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content Management Tabs */}
      <Tabs value={selectedSection} onValueChange={setSelectedSection}>
        <div className="flex items-center justify-between">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto">
            <TabsTrigger value="all">All Content</TabsTrigger>
            <TabsTrigger value="photography">Photos</TabsTrigger>
            <TabsTrigger value="floor_plans">Floor Plans</TabsTrigger>
            <TabsTrigger value="video">Video</TabsTrigger>
          </TabsList>
          
          <div className="flex space-x-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Download All
            </Button>
            <Button variant="outline" size="sm">
              <AlertCircle className="h-4 w-4 mr-2" />
              Request Changes
            </Button>
          </div>
        </div>

        {categories.map(category => (
          <TabsContent key={category} value={category}>
            <div className="grid gap-4">
              {getContentByCategory(category).map((piece) => (
                <Card key={piece.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          {getSectionIcon(piece.serviceCategory)}
                          <div>
                            <h3 className="font-medium text-gray-900">{piece.fileName}</h3>
                            <div className="flex items-center space-x-2 mt-1">
                              <Badge 
                                variant="secondary" 
                                className={getSectionColor(piece.serviceCategory)}
                              >
                                {piece.serviceCategory.replace('_', ' ')}
                              </Badge>
                              <span className="text-sm text-gray-500">
                                ${piece.cost.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          {piece.metadata.qcStatus}
                        </Badge>
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    </div>
                    
                    {/* Quality Check Details */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-gray-700">Instructions Followed:</span>
                          <p className="text-gray-600 mt-1">{piece.metadata.instructionsFollowed}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">QC Status:</span>
                          <p className="text-gray-600 mt-1">{piece.metadata.qcIssues}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Completion Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Completion Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Editor Details</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Editor:</span>
                  <span className="font-medium">{editorName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Completion Time:</span>
                  <span className="font-medium">{new Date(completionTimestamp).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Final Cost:</span>
                  <span className="font-medium">${finalCost.toFixed(2)}</span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Quality Assurance</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-600">Instructions Followed:</span>
                  <p className="text-gray-900 mt-1">{instructionsFollowed}</p>
                </div>
                <div>
                  <span className="text-gray-600">QC Issues:</span>
                  <p className="text-gray-900 mt-1">{qcIssues}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

ContentManagement.displayName = "ContentManagement";

export default ContentManagement;