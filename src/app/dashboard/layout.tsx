"use client";

import { useState } from "react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";
import { FeedbackModal } from "@/components/dashboard/feedback-modal";
import { EmailVerificationBanner } from "@/components/dashboard/email-verification-banner";
import { useSession } from "@/lib/auth-client";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { data: session } = useSession();

  return (
    <div className="flex h-screen">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        {session?.user && !session.user.emailVerified && (
          <EmailVerificationBanner 
            email={session.user.email} 
            verified={session.user.emailVerified} 
          />
        )}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
      <FeedbackModal />
    </div>
  );
}
