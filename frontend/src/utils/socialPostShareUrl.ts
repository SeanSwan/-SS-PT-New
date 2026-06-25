export const SOCIAL_POST_ROUTE_PREFIX = '/social/posts';

const getRuntimeOrigin = () => {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return '';
};

export const buildSocialPostSharePath = (postId: string) =>
  `${SOCIAL_POST_ROUTE_PREFIX}/${encodeURIComponent(postId)}`;

export const buildSocialPostShareUrl = (postId: string, origin = getRuntimeOrigin()) => {
  const path = buildSocialPostSharePath(postId);
  const normalizedOrigin = origin.replace(/\/$/, '');
  return normalizedOrigin ? `${normalizedOrigin}${path}` : path;
};

export const buildSocialPostDashboardRedirect = (postId: string) =>
  `/user-dashboard?postId=${encodeURIComponent(postId)}`;