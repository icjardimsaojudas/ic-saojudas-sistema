export const useApi = () => {
  const config = useRuntimeConfig();
  const base = config.public.apiBase.replace(/\/$/, "");

  const call = async <T = any>(
    path: string,
    options: { method?: string; body?: any; token?: string } = {}
  ): Promise<T> => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (options.token) headers["Authorization"] = `Bearer ${options.token}`;
    return await $fetch<T>(`${base}${path}`, {
      method: (options.method as any) || "GET",
      headers,
      body: options.body,
    });
  };

  return { call };
};
