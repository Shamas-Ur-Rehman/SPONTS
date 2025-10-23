"use client";

interface OnboardingRedirectProps {
  children: React.ReactNode;
}

/**
 * @param Composant wrapper simplifié
 *
 * N'effectue plus de redirections - cette logique est maintenant gérée par ProtectedRoute et le middleware
 */
export function OnboardingRedirect({ children }: OnboardingRedirectProps) {
  return <>{children}</>;
}