import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";

const QUICK_NOTES_USE = "quick_notes:use";

export default function RequireQuickNotesUse({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuthStore();
  if (!user?.permissions?.includes(QUICK_NOTES_USE)) {
    return <Navigate to="/daily-progress" replace />;
  }
  return <>{children}</>;
}
