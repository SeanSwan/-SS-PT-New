// AdminRoute.tsx (or define inline in AppRoutes)
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const AdminRoute = ({ children }: { children: JSX.Element }) => {
  const { user } = useAuth();

  if (!user || user.role !== "admin") {
    return <Navigate to="/unauthorized" replace />;
  }
  return children;
};

export default AdminRoute;
