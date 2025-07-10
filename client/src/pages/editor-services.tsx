
import React from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/layout/Layout";
import EditorServicesManager from "@/components/editor-services-manager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Mail, User } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export default function EditorServicesPage() {
  const { editorId } = useParams<{ editorId: string }>();
  const { user } = useAuth();
  
  // Fetch editor details
  const { data: editors } = useQuery({
    queryKey: ["/api/editors"],
  });
  
  const editor = editors?.find((e: any) => e.id === editorId);
  const isOwnProfile = user?.id === editorId;
  const isAdmin = user?.role === 'admin';
  const canEdit = isOwnProfile || isAdmin;

  if (!editorId) {
    return (
      <Layout>
        <div className="text-center py-8">
          <h1 className="text-2xl font-bold text-red-600">Editor not found</h1>
          <Link to="/editors" className="text-brand-blue hover:underline mt-4 inline-block">
            Back to Editors
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Link to="/editors">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Editors
            </Button>
          </Link>
          <div className="h-6 w-px bg-gray-300" />
          <h1 className="text-2xl font-bold">Editor Services</h1>
        </div>

        {/* Editor Info Card */}
        {editor && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={editor.profileImageUrl} />
                  <AvatarFallback>
                    <User className="h-8 w-8" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h2 className="text-xl font-semibold">
                      {editor.firstName} {editor.lastName}
                    </h2>
                    <Badge variant="secondary">{editor.role}</Badge>
                    {isOwnProfile && <Badge variant="outline">Your Profile</Badge>}
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <div className="flex items-center space-x-1">
                      <Mail className="h-4 w-4" />
                      <span>{editor.email}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Services Manager */}
        <EditorServicesManager 
          editorId={editorId}
          isAdmin={isAdmin}
          readOnly={!canEdit}
        />
      </div>
    </Layout>
  );
}
