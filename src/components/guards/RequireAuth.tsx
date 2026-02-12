import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/auth-context";
import TopRouteLoader from "../common/ui/TopRouteLoader";

export const RequireAuth = () => {
  const { state } = useAuth();

  const location = useLocation();

  if (state.status === "loading") {
    return (
      <div className="min-h-screen bg-light-background text-black dark:bg-dark-background dark:text-white grid place-items-center">
        {/* <TopRouteLoader /> */}
      </div>
    );
  }

  if (state.status === "guest") {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
};
