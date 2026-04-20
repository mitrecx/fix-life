import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";

const USERS_MANAGE = "users:manage";

export default function RequireUsersManage({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuthStore();
  if (!user?.permissions?.includes(USERS_MANAGE)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
