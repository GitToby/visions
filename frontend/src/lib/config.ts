const config = {
  api: {
    baseUrl:
      (import.meta.env.VITE_API_BASE_URL as string) || "http://localhost:8000",
  },
};

export default config;
