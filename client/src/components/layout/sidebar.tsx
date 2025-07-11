
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Users, 
  Building2,
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
  Home,
  Menu
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Sidebar as UISidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

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

const getFilteredNavigationSections = (userRole: string): NavSection[] => [
  // Standalone navigation items (no dropdowns)
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Customers", href: "/clients", icon: Users },
  { name: "Calendar", href: "/calendar", icon: Calendar },
  { name: "Jobs", href: "/jobs", icon: Camera },
  // TEMPORARY: Editor Dashboard for testing
  { name: "Editor Dashboard", href: "/editor-dashboard", icon: Camera },
  
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

function SidebarContent_() {
  const [location] = useLocation();
  const { user } = useAuth();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
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

  const userRole = user?.role || "licensee";
  const navigationSections = getFilteredNavigationSections(userRole);

  const isActive = (href: string) => {
    if (href === "/") {
      return location === "/";
    }
    return location.startsWith(href);
  };

  return (
    <>
      <SidebarHeader>
        <div className="flex items-center justify-center p-4">
          <h1 className="text-xl font-bold text-slate-900">RealEstate Media Pro</h1>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 py-4">
        <SidebarMenu>
          {navigationSections.map((section) => {
            const SectionIcon = section.icon;
            
            // Handle standalone navigation items (no subitems)
            if (section.href && !section.items) {
              return (
                <SidebarMenuItem key={section.name}>
                  <SidebarMenuButton asChild isActive={isActive(section.href)}>
                    <Link href={section.href}>
                      <SectionIcon className="h-5 w-5" />
                      <span>{section.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            }
            
            // Handle sections with subitems
            const isExpanded = expandedSections[section.name] !== undefined 
              ? expandedSections[section.name] 
              : section.defaultExpanded || false;
            
            return (
              <Collapsible
                key={section.name}
                open={isExpanded}
                onOpenChange={() => toggleSection(section.name)}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton className="w-full">
                      <SectionIcon className="h-5 w-5" />
                      <span>{section.name}</span>
                      {isExpanded ? (
                        <ChevronDown className="ml-auto h-4 w-4" />
                      ) : (
                        <ChevronRight className="ml-auto h-4 w-4" />
                      )}
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  {section.items && (
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {section.items.map((item) => {
                          const ItemIcon = item.icon;
                          return (
                            <SidebarMenuSubItem key={item.name}>
                              <SidebarMenuSubButton asChild isActive={isActive(item.href)}>
                                <Link href={item.href}>
                                  <ItemIcon className="h-4 w-4" />
                                  <span>{item.name}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          );
                        })}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  )}
                </SidebarMenuItem>
              </Collapsible>
            );
          })}
        </SidebarMenu>

        {/* Additional Navigation - Sign Out */}
        <div className="mt-6 pt-4 border-t border-slate-200">
          <SidebarMenu>
            {additionalNavigation.map((item) => {
              const Icon = item.icon;
              return (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton
                    onClick={() => window.location.href = item.href}
                    className="w-full"
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.name}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </div>
      </SidebarContent>

      <SidebarFooter>
        <div className="p-4">
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
      </SidebarFooter>
    </>
  );
}

export default function Sidebar() {
  return (
    <UISidebar>
      <SidebarContent_ />
    </UISidebar>
  );
}
