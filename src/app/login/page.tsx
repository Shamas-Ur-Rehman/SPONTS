import { Suspense } from "react";
import { LoginForm } from "@/components/pages/auth/login-form";
import { RedirectIfAuthenticated } from "@/components/auth/RedirectIfAuthenticated";

export default function LoginPage() {
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
          <LoginForm />
        </div>
      </RedirectIfAuthenticated>
    </Suspense>
  );
}
