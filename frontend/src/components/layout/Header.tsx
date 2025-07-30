"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Menu,
  Settings,
  LogOut,
  User,
  Languages,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface HeaderProps {
  onMenuClick?: () => void;
  sidebarCollapsed?: boolean;
  onSidebarToggle?: () => void;
  user?: {
    username: string;
    email: string;
    avatar?: string;
  };
  onLogout?: () => void;
}

export const Header = ({
  onMenuClick,
  sidebarCollapsed = false,
  onSidebarToggle,
  user,
  onLogout,
}: HeaderProps) => {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const getPageTitle = () => {
    switch (pathname) {
      case "/dashboard":
        return "Translation Dashboard";
      case "/history":
        return "Translation History";
      case "/settings":
        return "Settings";
      default:
        return "AI Translator";
    }
  };

  const handleLogout = () => {
    onLogout?.();
    setIsOpen(false);
  };

  return (
    <header className='sticky top-0 z-50 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60'>
      <div className='flex h-14 items-center'>
        {/* Mobile menu button */}
        <Button
          variant='ghost'
          size='icon'
          className='md:hidden ml-4'
          onClick={onMenuClick}
        >
          <Menu className='h-4 w-4' />
        </Button>

        {/* Desktop sidebar toggle */}
        <Button
          variant='ghost'
          size='icon'
          className='hidden md:flex ml-4'
          onClick={onSidebarToggle}
        >
          {sidebarCollapsed ? (
            <ChevronRight className='h-4 w-4' />
          ) : (
            <ChevronLeft className='h-4 w-4' />
          )}
        </Button>

        {/* Logo and Title */}
        <div className='flex items-center gap-2 ml-4'>
          <div className='flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground'>
            <Languages className='h-4 w-4' />
          </div>
          <div className='hidden md:flex flex-col'>
            <Link href='/dashboard' className='text-sm font-semibold'>
              AI Translator
            </Link>
            <span className='text-xs text-muted-foreground'>
              {getPageTitle()}
            </span>
          </div>
        </div>

        {/* Spacer to push user menu to the right */}
        <div className='flex-1' />

        {/* User Menu */}
        <div className='flex items-center gap-2 mr-4'>
          {user ? (
            <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant='ghost'
                  className='relative h-8 w-8 rounded-full'
                >
                  <Avatar className='h-8 w-8'>
                    <AvatarImage src={user.avatar} alt={user.username} />
                    <AvatarFallback>
                      {user.username.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className='w-56' align='end' forceMount>
                <DropdownMenuLabel className='font-normal'>
                  <div className='flex flex-col space-y-1'>
                    <p className='text-sm font-medium leading-none'>
                      {user.username}
                    </p>
                    <p className='text-xs leading-none text-muted-foreground'>
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href='/settings' className='flex items-center'>
                    <Settings className='mr-2 h-4 w-4' />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href='/profile' className='flex items-center'>
                    <User className='mr-2 h-4 w-4' />
                    <span>Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className='text-red-600'
                >
                  <LogOut className='mr-2 h-4 w-4' />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className='flex items-center gap-2'>
              <Button variant='ghost' size='sm' asChild>
                <Link href='/login'>Login</Link>
              </Button>
              <Button size='sm' asChild>
                <Link href='/register'>Sign Up</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
