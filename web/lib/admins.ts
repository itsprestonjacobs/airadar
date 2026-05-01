// Hardcoded admin email addresses.
// Anyone who signs in with one of these emails gets full admin access.
export const ADMIN_EMAILS: string[] = [
  "kenny@kennyjacobs.com",
  // Add more admin emails here
];

export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}
