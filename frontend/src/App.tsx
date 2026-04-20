import { useEffect } from "react";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import { useAuthStore } from "@/store/authStore";
import api from "@/services/api";
import type { User } from "@/types/auth";

function App() {
  const token = useAuthStore((s) => s.token);
  const setUser = useAuthStore((s) => s.setUser);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const user = await api.get<User>("/users/me");
        setUser(user);
      } catch {
        /* 401 handled by api interceptor */
      }
    })();
  }, [token, setUser]);

  return <RouterProvider router={router} />;
}

export default App;
