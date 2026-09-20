// Server configuration only. Never infer privileges from client-supplied fields.
export function isAdmin(user, env) {
  return !!user && typeof env.ADMIN_EMAILS === 'string' && env.ADMIN_EMAILS.split(',')
    .map(email => email.trim().toLowerCase()).filter(Boolean).includes(user.email.toLowerCase());
}
