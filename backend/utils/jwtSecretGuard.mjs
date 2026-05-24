const INSECURE_JWT_PLACEHOLDERS = new Set([
  'your-secret-key',
  'your-secret-key-change-in-production',
  'your-production-jwt-secret-key-here-change-this'
]);

export const createJwtSecretConfigurationError = (secretName = 'JWT_SECRET') => {
  const error = new Error(`${secretName} is not configured`);
  error.name = 'JwtSecretConfigurationError';
  return error;
};

export const isJwtSecretConfigurationError = (error) =>
  error?.name === 'JwtSecretConfigurationError';

export const resolveJwtSecret = (secretName, secret) => {
  if (!secret || INSECURE_JWT_PLACEHOLDERS.has(secret)) {
    throw createJwtSecretConfigurationError(secretName);
  }

  return secret;
};

export const getJwtSecret = () => resolveJwtSecret('JWT_SECRET', process.env.JWT_SECRET);
