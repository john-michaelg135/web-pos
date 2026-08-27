"use client";

import React from "react";

interface PageWrapperProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export function PageWrapper({ title, description, actions, children }: PageWrapperProps) {
  return (
    <div className="w-full min-h-full py-8 px-6 md:px-8 space-y-8 max-w-7xl mx-auto animate-page-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-headline-md font-bold tracking-tight text-foreground">
            {title}
          </h1>
          {description && (
            <p className="text-body-md text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>

      {/* Page Content */}
      {children}
    </div>
  );
}
