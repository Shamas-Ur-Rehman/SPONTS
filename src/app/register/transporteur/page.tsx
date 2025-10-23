"use client";

import { Suspense } from "react";
import { RedirectIfAuthenticated } from "@/components/auth/RedirectIfAuthenticated";
import { RegisterForm } from "@/components/pages/auth/register-form-transporteur";

export default function RegisterTransporteurPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <span
              className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"
              aria-label="Chargement"
            />
            <div className="text-lg">Chargement...</div>
          </div>
        </div>
      }
    >
      <RedirectIfAuthenticated>
        <div className="min-h-screen flex items-center justify-center">
          <RegisterForm />
        </div>
      </RedirectIfAuthenticated>
    </Suspense>
  );
}
