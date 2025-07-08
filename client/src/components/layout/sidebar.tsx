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
  UserCog,
  Briefcase,
  FileText,
  TrendingUp,
  Shield,
  User,
  MapPin,
  Truck,
  Package,
  Box,
  Clock,
  Home
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
  items?: NavItem[];
  href?: string;
  defaultExpanded?: boolean;
}

// Removed mainNavigation since Dashboard is now a standalone item

const getFilteredNavigationSections = (userRole: string): NavSection[] => [
  // Standalone navigation items (no dropdowns)
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Customers", href: "/clients", icon: Users },
  { name: "Calendar", href: "/calendar", icon: Calendar },
  { name: "Jobs", href: "/jobs", icon: Camera },
  
  // Production Hub with simplified items
  {
    name: "Production Hub",
    icon: FolderOpen,
    items: [
      { name: "Upload to Editor", href: "/production/upload", icon: Upload },
      // Editor Dashboard - only visible to editors
      ...(userRole === "editor" ? [{ name: "Editor Dashboard", href: "/editor-dashboard", icon: Camera }] : []),
      { name: "Order Status", href: "/production/status", icon: Clock },
    ]
  },
  
  // Reports section
  {
    name: "Reports",
    icon: BarChart3,
    items: [
      { name: "Job Reports", href: "/reports", icon: FileText },
      { name: "Revenue Overview", href: "/reports", icon: DollarSign },
      { name: "Performance", href: "/reports", icon: TrendingUp },
    ]
  },
  
  // Products section
  {
    name: "Products",
    icon: Package,
    items: [
      { name: "Product Management", href: "/products", icon: Package },
    ]
  },
];

const additionalNavigation = [
  { name: "Sign Out", href: "/api/logout", icon: LogOut },
];

export default function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
    // Initialize with default expanded sections
    return {
      "Dashboard": true,
      "Bookings & Jobs": true,
      "Production Hub": false,
    };
  });

  const toggleSection = (sectionName: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionName]: !prev[sectionName]
    }));
  };

  // Get user role for permission filtering
  const userRole = user?.role || "licensee";
  const navigationSections = getFilteredNavigationSections(userRole);

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
          {/* Main navigation now handled in navigationSections */}

          {/* Navigation Sections */}
          {navigationSections.map((section) => {
            const SectionIcon = section.icon;
            
            // Handle standalone navigation items (no subitems)
            if (section.href && !section.items) {
              return (
                <div key={section.name} className="mt-2">
                  <Link href={section.href}>
                    <button
                      className={cn(
                        "w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors hover:bg-slate-50",
                        isActive(section.href)
                          ? "bg-blue-50 text-blue-700 border-r-2 border-blue-700"
                          : "text-slate-700 hover:text-slate-900"
                      )}
                    >
                      <SectionIcon className="mr-3 h-5 w-5" />
                      {section.name}
                    </button>
                  </Link>
                </div>
              );
            }
            
            // Handle sections with subitems
            const isExpanded = expandedSections[section.name] !== undefined 
              ? expandedSections[section.name] 
              : section.defaultExpanded || false;
            
            return (
              <div key={section.name} className="mt-4">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSection(section.name);
                  }}
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
                
                {isExpanded && section.items && (
                  <div className="ml-6 mt-1 space-y-1">
                    {section.items.map((item) => {
                      const ItemIcon = item.icon;
                      return (
                        <Link key={item.name} href={item.href}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                            className={cn(
                              "w-full flex items-center px-3 py-2 text-sm rounded-md transition-colors hover:bg-slate-50",
                              isActive(item.href)
                                ? "bg-blue-50 text-blue-700 border-r-2 border-blue-700"
                                : "text-slate-600 hover:text-slate-900"
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

          {/* Additional Navigation - Sign Out */}
          <div className="mt-6 pt-4 border-t border-slate-200">
            {additionalNavigation.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.name}
                  onClick={() => window.location.href = item.href}
                  className="w-full flex items-center px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-md transition-colors"
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {item.name}
                </button>
              );
            })}
          </div>
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-slate-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-white">
                  {user?.firstName?.charAt(0) || user?.email?.charAt(0) || 'U'}
                </span>
              </div>
            </div>
            <div className="ml-3 flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">
                {user?.firstName && user?.lastName 
                  ? `${user.firstName} ${user.lastName}`
                  : user?.email || 'User'
                }
              </p>
              <p className="text-xs text-slate-500 truncate">
                {user?.email || ''}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}