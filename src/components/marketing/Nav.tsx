"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuLink,
} from "@/components/ui/navigation-menu";
import { Sheet, SheetTrigger, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Icons } from "@/components/icons";

const navItems = [
  { title: "Features", href: "#features" },
  { title: "AI Wizard", href: "#wizard" },
  { title: "SEO", href: "#seo" },
  { title: "Pricing", href: "#pricing" },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <header className="w-full border-b">
      <div className="container max-w-7xl mx-auto flex h-16 items-center justify-between px-5 py-4 lg:px-0 lg:py-0">
        {/* Left: Logo */}
        <div className="flex items-center gap-2 w-64 lg:px-3">
          <Link href="/" className="flex items-center gap-2">
            <svg width="32" height="32" viewBox="0 0 48 48" fill="currentColor" className="text-blue-600">
              <path d="M24 18.4228L42 11.475V34.3663C42 34.7796 41.7457 35.1504 41.3601 35.2992L24 42V18.4228Z"></path>
              <path d="M24 8.18819L33.4123 11.574L24 15.2071L14.5877 11.574L24 8.18819ZM9 15.8487L21 20.4805V37.6263L9 32.9945V15.8487ZM27 37.6263V20.4805L39 15.8487V32.9945L27 37.6263ZM25.354 2.29885C24.4788 1.98402 23.5212 1.98402 22.646 2.29885L4.98454 8.65208C3.7939 9.08038 3 10.2097 3 11.475V34.3663C3 36.0196 4.01719 37.5026 5.55962 38.098L22.9197 44.7987C23.6149 45.0671 24.3851 45.0671 25.0803 44.7987L42.4404 38.098C43.9828 37.5026 45 36.0196 45 34.3663V11.475C45 10.2097 44.2061 9.08038 43.0155 8.65208L25.354 2.29885Z"></path>
            </svg>
            <span className="sr-only">Home</span>
            <span className="subtitle-2 text-blue-900">Landie</span>
          </Link>
        </div>
        {/* Center: Nav */}
        <div className="flex-1 flex justify-center">
          <NavigationMenu>
            <NavigationMenuList className="hidden lg:flex">
              {navItems.map((item) => (
                <NavigationMenuItem key={item.href}>
                  <NavigationMenuLink asChild>
                    <Link
                      href={item.href}
                      className={cn(
                        "px-3 py-2 font-medium",
                        pathname === item.href ? "underline" : "hover:underline"
                      )}
                    >
                      {item.title}
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
              ))}
            </NavigationMenuList>
          </NavigationMenu>
        </div>
        {/* Right: Auth + CTA */}
        <div className="hidden lg:flex items-center gap-2 w-64 px-3 justify-end">
          <Link href="/login" className="paragraph-md px-3 py-2 hover:underline">
            Sign In
          </Link>
          <Link
            href=""
            className="paragraph-md px-4 py-2 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition"
          >
            Start Free Trial
          </Link>
        </div>
        {/* Mobile Menu */}
        <div className="lg:hidden w-full flex justify-end items-center">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <span className="flex items-center">
                  <Icons.menu className="size-8" />
                  <span className="sr-only">Open Menu</span>
                </span>
              </Button>
            </SheetTrigger>
            <SheetContent side="top" className="p-0">
              <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
              <nav className="flex flex-col gap-2 p-6 mt-6">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "subtitle-3 px-3 py-2 rounded hover:bg-muted",
                      pathname === item.href && "underline"
                    )}
                  >
                    {item.title}
                  </Link>
                ))}
                <Link href="/login" className="paragraph-md px-3 py-2 hover:underline">
                  Sign In
                </Link>
                <Link
                  href=""
                  className="mt-2 paragraph-md px-4 py-2 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition"
                >
                  Start Free Trial
                </Link>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
} 