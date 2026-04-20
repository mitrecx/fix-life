import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";

/**
 * Redirects to forced password change when the account must set a new password.
 * Wrap app shell (e.g. Layout) so only `/force-change-password` stays reachable via a separate route.
 */
export default function RequireNoPasswordReset({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuthStore();
  if (user?.must_change_password) {
    return <Navigate to="/force-change-password" replace />;
  }
  return <>{children}</>;
}
