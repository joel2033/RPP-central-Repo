import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<any> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  
  // Handle empty responses
  const contentType = res.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    const text = await res.text();
    if (!text) {
      return {};
    }
    throw new Error(`Expected JSON response but got: ${contentType || 'unknown'}`);
  }
  
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch (err) {
    console.error("Failed to parse response as JSON:", text);
    throw new Error(`Invalid JSON response: ${text}`);
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    
    // Handle empty responses
    const contentType = res.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      const text = await res.text();
      if (!text) {
        return {};
      }
      throw new Error(`Expected JSON response but got: ${contentType || 'unknown'}`);
    }
    
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch (err) {
      console.error("Failed to parse response as JSON:", text);
      throw new Error(`Invalid JSON response: ${text}`);
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
