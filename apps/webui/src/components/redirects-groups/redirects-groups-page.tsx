'use client';

import { useCallback, useEffect, useState } from "react";

import { AppHeader } from "@/components/ui/app-header";
import { RedirectsGroupsManager } from "@/components/redirects-groups";

export function RedirectsGroupsPage() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    if (!mobileSidebarOpen) {
      return;
    }

    const scrollY = window.scrollY;
    const body = document.body;
    const prev = {
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
      overflow: body.style.overflow,
    };

    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";
    body.style.overflow = "hidden";

    return () => {
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.width = prev.width;
      body.style.overflow = prev.overflow;
      window.scrollTo(0, scrollY);
    };
  }, [mobileSidebarOpen]);

  const toggleMobileSidebar = useCallback(() => {
    setMobileSidebarOpen((prev) => !prev);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader
        mobileSidebarToggle={{
          isOpen: mobileSidebarOpen,
          onToggle: toggleMobileSidebar,
        }}
      />
      <RedirectsGroupsManager
        mobileSidebarOpen={mobileSidebarOpen}
        onMobileSidebarOpenChange={setMobileSidebarOpen}
      />
    </div>
  );
}
