import axios from "axios";

const baseURL =
  import.meta.env.VITE_API_URL ||
  (window.location.hostname === "localhost"
    ? "http://localhost:3000"
    : `http://${window.location.hostname}:3000`);

export const employeeApi = axios.create({ baseURL, timeout: 30000 });

employeeApi.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("employee_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

employeeApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      sessionStorage.removeItem("employee_token");
      sessionStorage.removeItem("employee_user");
      window.location.href = "/employee";
    }
    return Promise.reject(error);
  }
);
