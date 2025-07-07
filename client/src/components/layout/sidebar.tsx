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
  LogOut 
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Clients CRM", href: "/clients", icon: Users },
  { name: "Bookings", href: "/bookings", icon: Calendar },
  { name: "Job Management", href: "/jobs", icon: Camera },
  { name: "Delivery Portal", href: "/delivery", icon: Download },
  { name: "Reports", href: "/reports", icon: BarChart3 },
  { name: "Settings", href: "/settings", icon: Settings },
];

export default function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuth();

  return (
    <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0">
      {/* Logo */}
      <div className="flex items-center justify-center h-16 bg-brand-blue">
        <h1 className="text-xl font-bold text-white">RealEstate Media Pro</h1>
      </div>
      
      {/* User Profile */}
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-brand-blue rounded-full flex items-center justify-center">
            <span className="text-white font-semibold text-sm">
              {user?.firstName?.[0] || user?.email?.[0]?.toUpperCase() || "U"}
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-900">
              {user?.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : user?.email || "User"}
            </p>
            <p className="text-xs text-slate-500 capitalize">{user?.role || "User"}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="mt-4 px-4 space-y-2">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href;
          
          return (
            <Link key={item.name} href={item.href}>
              <a
                className={cn(
                  "flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors",
                  isActive
                    ? "text-white bg-brand-blue"
                    : "text-slate-700 hover:bg-slate-100"
                )}
              >
                <Icon className="h-5 w-5 mr-3" />
                {item.name}
              </a>
            </Link>
          );
        })}
      </nav>

      {/* Sign Out */}
      <div className="absolute bottom-4 left-4 right-4">
        <button
          onClick={() => window.location.href = "/api/logout"}
          className="flex items-center w-full px-4 py-2 text-sm font-medium text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <LogOut className="h-5 w-5 mr-3" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
