export const cleanEmail = value => typeof value === 'string' ? value.trim().toLowerCase() : '';

export function isValidEmail(value) {
  const email = cleanEmail(value);
  if (email.length > 254) return false;
  const parts = email.split('@');
  if (parts.length !== 2) return false;
  const [local, domain] = parts;
  if (!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]{1,64}$/.test(local)
    || local.startsWith('.') || local.endsWith('.') || local.includes('..')) return false;
  const labels = domain.split('.');
  return labels.length >= 2 && /^[a-z]{2,63}$/.test(labels.at(-1))
    && labels.every(label => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label));
}

export const isValidCode = value => typeof value === 'string' && /^[0-9]{6}$/.test(value);
