"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FolderKanban, ListTree, Users, HardHat, ShieldCheck, LogOut, ClipboardList, Settings, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { LoginScreen } from "@/components/auth/login-screen";
import { Button } from "@/components/ui/button";

type NavItem = {
  href: string;
  label: string;
  icon: typeof FolderKanban;
  minRole: "worker" | "coordinator" | "owner";
};

const navItems: NavItem[] = [
  { href: "/my-work", label: "My Work", icon: Briefcase, minRole: "worker" },
  { href: "/", label: "Projects", icon: FolderKanban, minRole: "worker" },
  { href: "/activity-log", label: "Daily Log", icon: ClipboardList, minRole: "coordinator" },
  { href: "/library", label: "Library", icon: ListTree, minRole: "coordinator" },
  { href: "/crew", label: "Crew", icon: HardHat, minRole: "coordinator" },
  { href: "/contacts", label: "Contacts", icon: Users, minRole: "coordinator" },
  { href: "/admin/users", label: "Users", icon: ShieldCheck, minRole: "owner" },
  { href: "/settings", label: "Settings", icon: Settings, minRole: "owner" },
];

const ROLE_LEVELS: Record<string, number> = {
  worker: 1,
  coordinator: 2,
  owner: 3,
};

function isActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/" || pathname.startsWith("/projects");
  }
  return pathname === href || pathname.startsWith(href + "/");
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading, logout } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  const userLevel = ROLE_LEVELS[user.role ?? "worker"] ?? 1;
  const visibleNav = navItems.filter(
    (item) => userLevel >= (ROLE_LEVELS[item.minRole] ?? 1)
  );

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex md:w-60 md:flex-col md:fixed md:inset-y-0 border-r border-border bg-card">
        {/* Brand */}
        <div className="flex h-14 items-center gap-2 border-b border-border px-5">
          <FolderKanban className="h-5 w-5 text-green-700" />
          <span className="text-sm font-semibold tracking-tight">
            Jose&apos;s Yard Care
          </span>
        </div>

        {/* Nav links */}
        <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
          {visibleNav.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-green-50 text-green-800"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon
                  className={cn(
                    "h-4 w-4",
                    active ? "text-green-700" : "text-muted-foreground"
                  )}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="border-t border-border px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground capitalize">
                {user.role ?? "worker"}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={logout}
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* ── Main content area ── */}
      <div className="flex flex-1 flex-col md:pl-60">
        {/* Mobile header */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-card px-4 md:hidden">
          <div className="flex items-center">
            <FolderKanban className="mr-2 h-5 w-5 text-green-700" />
            <h1 className="text-sm font-semibold tracking-tight">
              Jose&apos;s Yard Care
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground capitalize">
              {user.name}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={logout}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 pb-16 md:pb-0">{children}</main>

        {/* Mobile bottom nav */}
        <nav className="fixed bottom-0 inset-x-0 z-30 flex h-16 items-center justify-around border-t border-border bg-card md:hidden">
          {visibleNav.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 px-3 py-1 text-xs font-medium transition-colors",
                  active
                    ? "text-green-700"
                    : "text-muted-foreground"
                )}
              >
                <item.icon
                  className={cn(
                    "h-5 w-5",
                    active ? "text-green-700" : "text-muted-foreground"
                  )}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
