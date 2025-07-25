import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, UserPlus, Upload, FileText } from "lucide-react";
import { Link } from "wouter";
import BookingModal from "@/components/modals/booking-modal";
import ClientModal from "@/components/modals/client-modal";

export default function QuickActions() {
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);

  const actions = [
    {
      title: "New Booking",
      icon: Plus,
      onClick: () => setIsBookingModalOpen(true),
      primary: true,
    },
    {
      title: "Add Client", 
      icon: UserPlus,
      onClick: () => setIsClientModalOpen(true),
    },
    {
      title: "Upload to Editor",
      icon: Upload,
      href: "/upload-to-editor",
    },
    {
      title: "Generate Report",
      icon: FileText,
      href: "/reports",
    },
  ];

  const recentActivities = [
    {
      text: "Job completed for Sunrise Realty",
      time: "2 hours ago",
      color: "bg-emerald-500",
    },
    {
      text: "New booking from Metro Properties",
      time: "5 hours ago",
      color: "bg-blue-500",
    },
    {
      text: "Files uploaded to editor for Premier Estates",
      time: "1 day ago",
      color: "bg-purple-500",
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 p-4">
          {actions.map((action) => {
            const Icon = action.icon;
            
            // If action has href, wrap in Link
            if (action.href) {
              return (
                <Link key={action.title} href={action.href} className="w-full">
                  <Button
                    className={`w-full flex flex-col items-center justify-center p-4 h-20 ${
                      action.primary
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                    variant={action.primary ? "default" : "secondary"}
                  >
                    <Icon className="h-5 w-5 mb-1" />
                    <span className="text-sm font-medium text-center leading-tight">{action.title}</span>
                  </Button>
                </Link>
              );
            }
            
            // Otherwise use onClick
            return (
              <Button
                key={action.title}
                onClick={action.onClick}
                className={`w-full flex flex-col items-center justify-center p-4 h-20 ${
                  action.primary
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
                variant={action.primary ? "default" : "secondary"}
              >
                <Icon className="h-5 w-5 mb-1" />
                <span className="text-sm font-medium text-center leading-tight">{action.title}</span>
              </Button>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {recentActivities.map((activity, index) => (
            <div key={index} className="flex items-start space-x-3">
              <div className={`w-2 h-2 rounded-full mt-2 ${activity.color}`} />
              <div>
                <p className="text-sm text-slate-600">{activity.text}</p>
                <p className="text-xs text-slate-400">{activity.time}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Modals */}
      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        booking={null}
      />
      <ClientModal
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        client={null}
      />
    </div>
  );
}
