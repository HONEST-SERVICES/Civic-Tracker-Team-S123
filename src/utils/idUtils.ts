/**
 * ID Formatting utilities for CitizenPulse
 */

export function formatCitizenId(uid?: string | null): string {
  if (!uid) return '#CP-8492';
  if (uid.startsWith('#CP-')) return uid;
  
  // Extract numbers or hash characters from uid
  let hash = 0;
  for (let i = 0; i < uid.length; i++) {
    hash = (hash << 5) - hash + uid.charCodeAt(i);
    hash |= 0;
  }
  const positiveHash = Math.abs(hash) % 9000 + 1000;
  return `#CP-${positiveHash}`;
}

export function formatTicketId(id?: string | null): string {
  if (!id) return '#TK-1001';
  if (id.startsWith('#TK-')) return id;
  if (id.startsWith('Ticket #')) {
    const num = id.replace(/[^0-9]/g, '');
    return num ? `#TK-${num}` : id;
  }
  
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  const positiveHash = Math.abs(hash) % 9000 + 1000;
  return `#TK-${positiveHash}`;
}
