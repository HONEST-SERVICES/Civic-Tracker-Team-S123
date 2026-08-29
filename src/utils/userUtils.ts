/**
 * User initials generator for high-contrast slate gradient avatars
 */
export function getUserInitials(name?: string | null): string {
  if (!name || !name.trim()) return 'AP';
  const cleanName = name.trim();
  const parts = cleanName.split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return cleanName.slice(0, 2).toUpperCase();
}
