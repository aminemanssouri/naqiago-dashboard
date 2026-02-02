"use client";

import * as React from "react";
import Link from "next/link";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationDropdown } from "@/components/notification-dropdown";
import { UserProfileDropdown } from "@/components/user-profile-dropdown";

export function DashboardPage({
  title,
  description,
  breadcrumb,
  actions,
  children,
}) {
  const items = React.useMemo(() => {
    if (breadcrumb?.length) {
      return breadcrumb;
    }

    return [{ label: title, href: undefined }];
  }, [breadcrumb, title]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <header className="flex h-16 shrink-0 items-center justify-between gap-2 px-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 z-10 relative">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              {items.map((item, index) => {
                const isLast = index === items.length - 1;
                const hideOnMobile = items.length > 1 && index === 0;
                return (
                  <React.Fragment key={`${item.label}-${index}`}>
                    <BreadcrumbItem className={hideOnMobile ? "hidden md:block" : undefined}>
                      {isLast ? (
                        <BreadcrumbPage>{item.label}</BreadcrumbPage>
                      ) : item.href ? (
                        <BreadcrumbLink asChild>
                          <Link href={item.href}>{item.label}</Link>
                        </BreadcrumbLink>
                      ) : (
                        <BreadcrumbPage>{item.label}</BreadcrumbPage>
                      )}
                    </BreadcrumbItem>
                    {!isLast && <BreadcrumbSeparator className="hidden md:block" />}
                  </React.Fragment>
                );
              })}
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <NotificationDropdown />
          <UserProfileDropdown />
          {actions && <Separator orientation="vertical" className="h-4" />}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      </header>
      {/* Main Content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="min-h-full max-w-full">
          <div className="flex flex-col gap-4 p-4 max-w-full"> 
            {/* Page Content */}
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}

export function DashboardPlaceholder({
  heading,
  description,
  children,
}) {
  return (
    <Card className="border-muted/60">
      <CardHeader>
        <CardTitle>{heading}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      {children ? <CardContent>{children}</CardContent> : null}
    </Card>
  );
}
