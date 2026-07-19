import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { paths } from "@/lib/paths";
import { useAuthStore } from "@/stores/auth.store";
import { useLogoutMutation } from "@/queries/auth.mutations";
import { Code2, Trophy, LayoutList, User, LogOut, Menu, X } from "lucide-react";

type NavItem = { to: string; icon: ReactNode; label: string };

/**
 * The nav. One entry per section — every link renders on every page and the
 * current one is highlighted, so the bar never reflows between routes.
 */
const NAV: NavItem[] = [
  { to: paths.problems, icon: <Code2 className="w-4 h-4" />, label: "Problems" },
  { to: paths.contests, icon: <Trophy className="w-4 h-4" />, label: "Contests" },
  { to: paths.myContests, icon: <LayoutList className="w-4 h-4" />, label: "My Arena" },
];

/** A section is active for its own path and anything nested under it. */
function isSectionActive(pathname: string, to: string): boolean {
  return pathname === to || pathname.startsWith(`${to}/`);
}

function AccountMenu() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { mutate: logout, isPending: isLoggingOut } = useLogoutMutation();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Dismiss on outside click / Escape. Hand-rolled rather than pulling in
  // @radix-ui/react-dropdown-menu for a three-item menu.
  useEffect(() => {
    if (!isOpen) return;

    const onPointerDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setIsOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  // Goes through the API so the refresh cookie is cleared server-side; the store
  // is only cleared on success. Navigate either way — a failed logout call still
  // means the user asked to leave.
  const handleLogout = () => {
    setIsOpen(false);
    logout(undefined, {
      onSettled: () => navigate(paths.login, { replace: true }),
    });
  };

  const initials = (user?.name ?? "?")
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label="Account menu"
        className="flex items-center rounded-full ring-offset-background transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <Avatar className="h-8 w-8 border border-border">
          <AvatarFallback className="text-xs font-medium">{initials}</AvatarFallback>
        </Avatar>
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-56 overflow-hidden rounded-md border border-border bg-popover shadow-lg"
        >
          <div className="border-b border-border px-3 py-2.5">
            <p className="truncate text-sm font-medium text-foreground">{user?.name}</p>
            <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
          </div>
          <Link
            to={paths.profile}
            role="menuitem"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent"
          >
            <User className="h-4 w-4" />
            Profile
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive transition-colors hover:bg-accent disabled:opacity-50"
          >
            <LogOut className="h-4 w-4" />
            {isLoggingOut ? "Logging out…" : "Log out"}
          </button>
        </div>
      )}
    </div>
  );
}

export function AppNavbar() {
  const { pathname } = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/50 backdrop-blur-sm">
      <div className="container mx-auto flex items-center justify-between px-4 py-4">
        <div className="flex items-center gap-6">
          <Link to={paths.problems} className="flex items-center gap-2">
            <img src="/logo.png" alt="" className="h-8 w-auto" />
            <span className="font-mono text-xl font-bold">
              <span className="text-primary">Code</span>
              <span className="text-foreground">Arena</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((item) => {
              const isActive = isSectionActive(pathname, item.to);
              return (
                <Link key={item.to} to={item.to}>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "gap-2",
                      isActive && "bg-secondary text-foreground font-semibold",
                    )}
                  >
                    {item.icon}
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <AccountMenu />
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label={isMobileOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={isMobileOpen}
            onClick={() => setIsMobileOpen((prev) => !prev)}
          >
            {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {isMobileOpen && (
        <nav className="border-t border-border px-4 py-2 md:hidden">
          {NAV.map((item) => {
            const isActive = isSectionActive(pathname, item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                aria-current={isActive ? "page" : undefined}
                // Collapse the sheet on navigation.
                onClick={() => setIsMobileOpen(false)}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2.5 text-sm transition-colors hover:bg-accent",
                  isActive ? "bg-secondary font-semibold text-foreground" : "text-muted-foreground",
                )}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
}
