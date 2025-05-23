// src/routes/fallback-components/FallbackHomePage.tsx
import React from 'react';

const FallbackHomePage: React.FC = () => {
  return (
    <div className="fallback-home">
      <h1>Welcome to Our Service</h1>
      <p>We're experiencing technical difficulties loading the home page.</p>
      <p>Please try refreshing your browser, or contact support if the problem persists.</p>
    </div>
  );
};

export default { default: FallbackHomePage };