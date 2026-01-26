import { type ReactNode } from "react";
import { Link, matchPath } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Trophy, LayoutList, User } from "lucide-react";

export type NavLink = { to: string; icon: ReactNode; label: string };

const NAV_LINKS = {
  dashboard: [
    { to: "/contests", icon: <LayoutList className="w-4 h-4" />, label: "All Contests" },
    { to: "/my-contests", icon: <LayoutList className="w-4 h-4" />, label: "My Contests" },
    { to: "/profile", icon: <User className="w-4 h-4" />, label: "Profile" },
  ] as NavLink[],
  contests: [
    { to: "/dashboard", icon: <Trophy className="w-4 h-4" />, label: "Dashboard" },
    { to: "/my-contests", icon: <LayoutList className="w-4 h-4" />, label: "My Contests" },
    { to: "/profile", icon: <User className="w-4 h-4" />, label: "Profile" },
  ] as NavLink[],
  myContests: [
    { to: "/dashboard", icon: <Trophy className="w-4 h-4" />, label: "Dashboard" },
    { to: "/contests", icon: <LayoutList className="w-4 h-4" />, label: "All Contests" },
    { to: "/profile", icon: <User className="w-4 h-4" />, label: "Profile" },
  ] as NavLink[],
  profile: [
    { to: "/dashboard", icon: <Trophy className="w-4 h-4" />, label: "Dashboard" },
    { to: "/contests", icon: <LayoutList className="w-4 h-4" />, label: "All Contests" },
    { to: "/my-contests", icon: <LayoutList className="w-4 h-4" />, label: "My Contests" },
  ] as NavLink[],
  default: [
    { to: "/dashboard", icon: <Trophy className="w-4 h-4" />, label: "Dashboard" },
    { to: "/contests", icon: <LayoutList className="w-4 h-4" />, label: "All Contests" },
    { to: "/my-contests", icon: <LayoutList className="w-4 h-4" />, label: "My Contests" },
    { to: "/profile", icon: <User className="w-4 h-4" />, label: "Profile" },
  ] as NavLink[],
};

export function getNavbarLinks(pathname: string): NavLink[] {
  if (pathname === "/" || pathname === "/dashboard") return NAV_LINKS.dashboard;
  if (pathname === "/contests") return NAV_LINKS.contests;
  if (pathname === "/my-contests") return NAV_LINKS.myContests;
  if (pathname === "/profile") return NAV_LINKS.profile;
  if (matchPath({ path: "/contest/:id/details", end: true }, pathname)) return NAV_LINKS.default;
  if (matchPath({ path: "/leaderboard/:contestId?", end: true }, pathname)) return NAV_LINKS.default;
  if (matchPath({ path: "/results/:attemptId", end: true }, pathname)) return NAV_LINKS.default;
  return NAV_LINKS.default;
}

export function isContestAttemptRoute(pathname: string): boolean {
  return matchPath({ path: "/contest/:id", end: true }, pathname) != null;
}

interface AppNavbarProps {
  links: NavLink[];
}

export function AppNavbar({ links }: AppNavbarProps) {
  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="flex items-center justify-between container mx-auto px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-primary" />
          </div>
          <Link to="/">
            <h1 className="text-xl font-bold text-foreground">CodeArena</h1>
            <p className="text-xs text-muted-foreground">Competitive Coding Platform</p>
          </Link>
        </div>
        <nav className="flex items-center gap-2">
          {links.map((link) => (
            <Link key={link.to} to={link.to}>
              <Button variant="ghost" size="sm" className="gap-2">
                {link.icon}
                <span className="hidden sm:inline">{link.label}</span>
              </Button>
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
