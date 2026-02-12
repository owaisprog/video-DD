import { api } from "./api";

export const authApi = () => api.get("/v1/users/get-current-user");

export const signupApi = (payload: any) =>
  api.post("/v1/users/register", payload);

export const loginApi = (payload: any) => api.post("/v1/users/login", payload);

export const logoutApi = () => api.get("/v1/users/logout");
