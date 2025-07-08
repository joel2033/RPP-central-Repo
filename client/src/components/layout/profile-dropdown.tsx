import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
// Avatar component will be replaced with simpler div
import {
  User,
  Building,
  Users,
  CreditCard,
  Download,
  Settings,
  LogOut,
  Shield
} from "lucide-react";

export default function ProfileDropdown() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase();
  };

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  // Role-based menu items
  const getMenuItems = () => {
    const userRole = user?.role || "licensee";
    const items = [
      {
        label: "My Profile",
        icon: User,
        href: "/profile",
        description: "Edit name, email, timezone, password",
        roles: ["admin", "licensee", "photographer", "va", "editor"]
      },
      {
        label: "Business Details",
        icon: Building,
        href: "/business-settings",
        description: "Branding, hours, service areas, domain",
        roles: ["admin", "licensee"]
      },
      {
        label: "Team Members",
        icon: Users,
        href: "/team-management",
        description: "Manage roles and permissions",
        roles: ["admin", "licensee"]
      },
      {
        label: "Billing & Payments",
        icon: CreditCard,
        href: "/billing",
        description: "Stripe integration, payment history, payouts",
        roles: ["admin", "licensee"]
      },
      {
        label: "Delivery Pages",
        icon: Download,
        href: "/delivery-settings",
        description: "Page settings, file access",
        roles: ["admin", "licensee", "va"]
      },
      {
        label: "Admin Settings",
        icon: Shield,
        href: "/admin-settings",
        description: "System preferences, advanced settings",
        roles: ["admin"]
      }
    ];

    return items.filter(item => item.roles.includes(userRole));
  };

  if (!user) return null;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <div className="h-8 w-8 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center">
            {getInitials(user.name || "User")}
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.name || "User"}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email || ""}
            </p>
            <p className="text-xs leading-none text-muted-foreground capitalize">
              {user.role || "user"} • {user.licenseeId || "N/A"}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {getMenuItems().map((item) => {
            const Icon = item.icon;
            return (
              <DropdownMenuItem
                key={item.label}
                className="cursor-pointer"
                onClick={() => {
                  window.location.href = item.href;
                  setIsOpen(false);
                }}
              >
                <Icon className="mr-2 h-4 w-4" />
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{item.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {item.description}
                  </span>
                </div>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}