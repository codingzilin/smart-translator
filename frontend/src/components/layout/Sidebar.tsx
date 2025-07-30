"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Languages,
  History,
  Settings,
  Heart,
  BookOpen,
  Download,
  LogOut,
  X,
} from "lucide-react";

interface SidebarProps {
  isOpen?: boolean;
  collapsed?: boolean;
  onClose?: () => void;
  user?: {
    username: string;
    email: string;
    avatar?: string;
  };
  onLogout?: () => void;
}

export const Sidebar = ({
  isOpen = false,
  collapsed = false,
  onClose,
  user,
  onLogout,
}: SidebarProps) => {
  const pathname = usePathname();

  const navigationItems = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: Languages,
      description: "Translation dashboard",
    },
    {
      href: "/history",
      label: "History",
      icon: History,
      description: "View translation history",
    },
    {
      href: "/favorites",
      label: "Favorites",
      icon: Heart,
      description: "Saved translations",
    },
    {
      href: "/settings",
      label: "Settings",
      icon: Settings,
      description: "Account settings",
    },
  ];

  const quickActions = [
    {
      href: "/history",
      label: "View History",
      icon: BookOpen,
    },
    {
      href: "/favorites",
      label: "My Favorites",
      icon: Heart,
    },
    {
      href: "/export",
      label: "Export Data",
      icon: Download,
    },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className='fixed inset-0 z-40 bg-black/50 md:hidden'
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed left-0 top-0 z-50 h-full bg-background border-r transition-all duration-200 ease-in-out md:translate-x-0 ${
          collapsed ? "w-16" : "w-64"
        } ${isOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className='flex h-full flex-col'>
          {/* Header */}
          <div className='flex h-14 items-center justify-between px-4 border-b'>
            <div className='flex items-center gap-2'>
              <div className='flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground'>
                <Languages className='h-4 w-4' />
              </div>
              {!collapsed && (
                <span className='font-semibold'>AI Translator</span>
              )}
            </div>
            <Button
              variant='ghost'
              size='icon'
              className='md:hidden'
              onClick={onClose}
            >
              <X className='h-4 w-4' />
            </Button>
          </div>

          {/* Navigation */}
          <nav className='flex-1 px-4 py-4 space-y-2'>
            <div className='space-y-1'>
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                return (
                  <Link key={item.href} href={item.href}>
                    <Button
                      variant={isActive ? "secondary" : "ghost"}
                      className={`w-full justify-start ${
                        collapsed ? "px-2" : ""
                      }`}
                      onClick={onClose}
                      title={collapsed ? item.label : undefined}
                    >
                      <Icon
                        className={`${collapsed ? "h-4 w-4" : "mr-2 h-4 w-4"}`}
                      />
                      {!collapsed && (
                        <div className='flex flex-col items-start'>
                          <span className='text-sm font-medium'>
                            {item.label}
                          </span>
                          <span className='text-xs text-muted-foreground'>
                            {item.description}
                          </span>
                        </div>
                      )}
                    </Button>
                  </Link>
                );
              })}
            </div>

            {!collapsed && <Separator className='my-4' />}

            {/* Quick Actions */}
            {!collapsed && (
              <div className='space-y-1'>
                <h3 className='text-xs font-medium text-muted-foreground mb-2'>
                  Quick Actions
                </h3>
                {quickActions.map((item) => {
                  const Icon = item.icon;

                  return (
                    <Link key={item.href} href={item.href}>
                      <Button
                        variant='ghost'
                        size='sm'
                        className='w-full justify-start'
                        onClick={onClose}
                      >
                        <Icon className='mr-2 h-3 w-3' />
                        <span className='text-sm'>{item.label}</span>
                      </Button>
                    </Link>
                  );
                })}
              </div>
            )}
          </nav>

          {/* User Section */}
          {user && (
            <div className='border-t p-4'>
              <div className='flex items-center gap-3'>
                <Avatar className='h-8 w-8 flex-shrink-0'>
                  <AvatarImage src={user.avatar} alt={user.username} />
                  <AvatarFallback>
                    {user.username.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {!collapsed && (
                  <div className='flex-1 min-w-0'>
                    <p className='text-sm font-medium truncate'>
                      {user.username}
                    </p>
                    <p className='text-xs text-muted-foreground truncate'>
                      {user.email}
                    </p>
                  </div>
                )}
                <Button
                  variant='ghost'
                  size='icon'
                  onClick={onLogout}
                  className='h-8 w-8 flex-shrink-0'
                  title={collapsed ? "Logout" : undefined}
                >
                  <LogOut className='h-4 w-4' />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
