/**
 * ParamRedirect.tsx
 * =================
 * Reusable param-preserving redirect helper for legacy admin routes.
 * Reads named URL params (clientId, id) and appends them to workspace target.
 * Preserves query string and hash from the original URL.
 */

import React from 'react';
import { useParams, useLocation, Navigate } from 'react-router-dom';

interface ParamRedirectProps {
  base: string;
}

const ParamRedirect: React.FC<ParamRedirectProps> = ({ base }) => {
  const params = useParams();
  const location = useLocation();
  const paramSuffix = params.clientId || params.id || '';
  const pathname = paramSuffix
    ? `${base}/${encodeURIComponent(paramSuffix)}`
    : base;

  return (
    <Navigate
      to={{ pathname, search: location.search, hash: location.hash }}
      replace
    />
  );
};

export default ParamRedirect;
