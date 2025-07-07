import { useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  Camera, 
  Download, 
  BarChart3, 
  Settings, 
  LogOut,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  Upload,
  Eye,
  RotateCcw,
  UserPlus,
  CalendarPlus,
  DollarSign,
  UserCog
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

interface NavItem {
  name: string;
  href: string;
  icon: any;
}

interface NavSection {
  name: string;
  icon: any;
  items: NavItem[];
  defaultExpanded?: boolean;
}

const mainNavigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
];

const navigationSections: NavSection[] = [
  {
    name: "Clients",
    icon: Users,
    items: [
      { name: "CRM", href: "/clients", icon: Users },
      { name: "Client Preferences", href: "/clients", icon: UserPlus },
    ]
  },
  {
    name: "Bookings",
    icon: Calendar,
    items: [
      { name: "Calendar", href: "/bookings", icon: Calendar },
      { name: "New Booking", href: "/bookings", icon: CalendarPlus },
    ]
  },
  {
    name: "Production Hub",
    icon: FolderOpen,
    defaultExpanded: true,
    items: [
      { name: "Upload to Editor", href: "/upload-to-editor", icon: Upload },
      { name: "Editor Dashboard", href: "/editor", icon: Camera },
      { name: "QA Review", href: "/qa-review", icon: Eye },
      { name: "Revisions Queue", href: "/qa-review", icon: RotateCcw },
    ]
  },
  {
    name: "Reports",
    icon: BarChart3,
    items: [
      { name: "Analytics", href: "/reports", icon: BarChart3 },
      { name: "Revenue", href: "/reports", icon: DollarSign },
    ]
  },
  {
    name: "Settings",
    icon: Settings,
    items: [
      { name: "General", href: "/settings", icon: Settings },
      { name: "User Management", href: "/settings", icon: UserCog },
    ]
  },
];

const additionalNavigation = [
  { name: "Job Management", href: "/jobs", icon: Camera },
  { name: "Delivery Portal", href: "/delivery", icon: Download },
];

export default function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
    // Initialize with default expanded sections
    const initial: Record<string, boolean> = {};
    navigationSections.forEach(section => {
      if (section.defaultExpanded) {
        initial[section.name] = true;
      }
    });
    return initial;
  });

  const toggleSection = (sectionName: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionName]: !prev[sectionName]
    }));
  };

  const isActive = (href: string) => {
    if (href === "/") {
      return location === "/";
    }
    return location.startsWith(href);
  };

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  return (
    <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 overflow-y-auto">
      <div className="flex flex-col h-full">
        {/* Logo/Header */}
        <div className="flex items-center justify-center h-16 px-4 border-b border-slate-200">
          <h1 className="text-xl font-bold text-slate-900">RealEstate Media Pro</h1>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {/* Main Navigation */}
          {mainNavigation.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.name} href={item.href}>
                <button
                  className={cn(
                    "w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                    isActive(item.href)
                      ? "bg-blue-50 text-blue-700 border-r-2 border-blue-700"
                      : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {item.name}
                </button>
              </Link>
            );
          })}

          {/* Collapsible Sections */}
          {navigationSections.map((section) => {
            const SectionIcon = section.icon;
            const isExpanded = expandedSections[section.name] !== undefined 
              ? expandedSections[section.name] 
              : section.defaultExpanded || false;
            
            return (
              <div key={section.name} className="mt-4">
                <button
                  onClick={() => toggleSection(section.name)}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-md transition-colors"
                >
                  <div className="flex items-center">
                    <SectionIcon className="mr-3 h-5 w-5" />
                    {section.name}
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
                
                {isExpanded && (
                  <div className="ml-6 mt-1 space-y-1">
                    {section.items.map((item) => {
                      const ItemIcon = item.icon;
                      return (
                        <Link key={item.name} href={item.href}>
                          <button
                            className={cn(
                              "w-full flex items-center px-3 py-2 text-sm rounded-md transition-colors",
                              isActive(item.href)
                                ? "bg-blue-50 text-blue-700 border-r-2 border-blue-700"
                                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                            )}
                          >
                            <ItemIcon className="mr-3 h-4 w-4" />
                            {item.name}
                          </button>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Additional Navigation */}
          <div className="mt-6 pt-4 border-t border-slate-200">
            {additionalNavigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.name} href={item.href}>
                  <button
                    className={cn(
                      "w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                      isActive(item.href)
                        ? "bg-blue-50 text-blue-700 border-r-2 border-blue-700"
                        : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                    )}
                  >
                    <Icon className="mr-3 h-5 w-5" />
                    {item.name}
                  </button>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* User Profile & Logout */}
        <div className="border-t border-slate-200 p-4">
          <div className="flex items-center mb-3">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {user?.firstName?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              </div>
            </div>
            <div className="ml-3 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-slate-500 truncate">
                {user?.email}
              </p>
            </div>
          </div>
          
          <Button
            onClick={handleLogout}
            variant="outline"
            size="sm"
            className="w-full justify-start"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}