import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  PlusCircle,
  FileText,
  Database,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth.store";
import { useLogoutMutation } from "@/queries/auth.mutations";

const navItems = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Create Contest", path: "/contests/new", icon: PlusCircle },
  { label: "Create Question", path: "/questions/new", icon: FileText },
  { label: "Question Bank", path: "/questions", icon: Database },
];

export const Sidebar = () => {
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const { mutate: logout, isPending: isLoggingOut } = useLogoutMutation();

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <aside className="w-64 h-screen bg-sidebar border-r border-sidebar-border flex flex-col overflow-hidden">
      {/* Logo */}
      <div className="p-6 shrink-0">
        <Link to="/dashboard" className="flex items-center gap-2">
          <img src="/logo.png" alt="Code Arena" className="h-8 w-auto" />
          <span className="font-mono text-xl font-bold">
            <span className="text-primary">Code</span>
            <span className="text-foreground">Arena</span>
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 overflow-y-auto min-h-0">
        <div className="mb-4 px-3">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Arena Admin
          </span>
        </div>
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive =
              location.pathname === item.path ||
              (item.path === "/dashboard" && location.pathname === "/");
            const Icon = item.icon;

            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all relative",
                    isActive
                      ? "text-primary bg-sidebar-accent"
                      : "text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent"
                  )}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-r-full" />
                  )}
                  <div>
                    <Icon className="w-4 h-4" />
                  </div>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Info */}
      {user && (
        <div className="p-3 border-t border-sidebar-border shrink-0">
          <div className="w-full flex items-center gap-3 px-3 py-3 rounded-md bg-muted/50  transition-all">
            <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium shrink-0">
              {getInitials(user.name)}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium text-foreground truncate">
                {user.name}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user.email}
              </p>
            </div>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className={cn(
                " transition-all group",
                isLoggingOut && "opacity-50 cursor-not-allowed"
              )}
            >
              <LogOut className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
};
