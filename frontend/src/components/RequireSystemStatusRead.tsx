import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";

const SYSTEM_STATUS_READ = "system_status:read";

export default function RequireSystemStatusRead({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuthStore();
  if (!user?.permissions?.includes(SYSTEM_STATUS_READ)) {
    return <Navigate to="/settings/display" replace />;
  }
  return <>{children}</>;
}
