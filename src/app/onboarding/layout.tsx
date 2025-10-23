"use client";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { TempAuthProvider } from "@/components/auth/TempAuthProvider";

interface OnboardingLayoutProps {
  children: React.ReactNode;
}

export default function OnboardingLayout({ children }: OnboardingLayoutProps) {
  return (
    <ProtectedRoute requireOnboardingCompleted={false}>
      <TempAuthProvider>
        <div className="min-h-screen flex items-center justify-center p-4">
          {children}
        </div>
      </TempAuthProvider>
    </ProtectedRoute>
  );
}