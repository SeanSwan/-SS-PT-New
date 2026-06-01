/**
 * Shared client identity helpers for the canonical Client Hub.
 */

interface ClientIdentityInput {
  id?: number | string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  username?: string | null;
}

const clean = (value: unknown): string => String(value ?? '').replace(/\s+/g, ' ').trim();

export const getClientDisplayName = (client: ClientIdentityInput): string => {
  const name = [client.firstName, client.lastName].map(clean).filter(Boolean).join(' ');
  if (name) return name;

  const email = clean(client.email);
  if (email) return email;

  const username = clean(client.username);
  if (username) return username;

  return client.id != null ? `Client ${client.id}` : 'Client';
};

export const getClientInitials = (client: ClientIdentityInput): string => {
  const nameParts = [client.firstName, client.lastName].map(clean).filter(Boolean);
  const source = nameParts.length > 0 ? nameParts.join(' ') : getClientDisplayName(client);
  const chars = source.replace(/[^a-z0-9]/gi, '').slice(0, 2).toUpperCase();
  return chars || 'CL';
};
