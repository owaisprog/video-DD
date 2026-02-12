export const isAuthenticated = () => {
  const token = localStorage.getItem("accessToken"); // or cookies
  return Boolean(token);
};

