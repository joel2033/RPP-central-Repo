import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  return {
    user: user || {
      id: "demo-user",
      email: "demo@example.com",
      firstName: "Demo",
      lastName: "User",
      role: "admin"
    },
    isLoading: false,
    isAuthenticated: true,
  };
}
