import React from 'react';
import { Outlet } from 'react-router-dom';

// Minimal layout for auth pages - no header/sidebar
const MinimalLayout = () => {
  return (
    <div>
      <Outlet />
    </div>
  );
};

export default MinimalLayout;