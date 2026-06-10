"use client";

import React from "react";
import { ShieldAlert } from "lucide-react";

export function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-8 text-center animate-in fade-in duration-500">
      <div className="relative mb-6">
        {/* Glow effect */}
        <div className="absolute inset-0 bg-red-500/20 blur-2xl rounded-full w-24 h-24 -translate-x-4 -translate-y-4"></div>
        <div className="relative flex items-center justify-center w-20 h-20 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-500">
          <ShieldAlert size={40} className="animate-bounce" />
        </div>
      </div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        Access Denied
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md">
        You do not have the required permissions to view this module. Please contact your system administrator if you believe this is an error.
      </p>
    </div>
  );
}

export default AccessDenied;
