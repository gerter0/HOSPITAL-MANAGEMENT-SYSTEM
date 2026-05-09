import axios from "axios";

const rawApiUrl = import.meta.env.VITE_API_URL;
const API_BASE_URL = (() => {
  if (!rawApiUrl) return "http://localhost:5000/api/v1";
  if (rawApiUrl.startsWith("http://") || rawApiUrl.startsWith("https://")) return rawApiUrl;
  if (rawApiUrl.startsWith(":")) return `http://localhost${rawApiUrl}`;
  if (rawApiUrl.startsWith("localhost") || /^[0-9]/.test(rawApiUrl)) return `http://${rawApiUrl}`;
  return rawApiUrl;
})();

console.log('🔍 API Configuration Debug:');
console.log('  rawApiUrl:', rawApiUrl);
console.log('  API_BASE_URL:', API_BASE_URL);

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = "Bearer " + token;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only redirect on 401 if NOT a login attempt (preserves login error handling)
    if (error.response?.status === 401) {
      const requestUrl = error.config?.url || '';
      const isLoginAttempt = requestUrl.includes('/auth/login') || requestUrl.includes('/admin/auth/login');
      
      if (!isLoginAttempt) {
        // Token expired or unauthorized for other endpoints - redirect to login
        localStorage.clear();
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export { apiClient };
export default apiClient;
