export const formatPhoneInput = (raw: string): string => {
  const digits = raw.replace(/\D/g, '');
  const trimmed = raw.trimStart();
  if (!digits) return trimmed.startsWith('+') ? '+' : '';
  if (trimmed.startsWith('+') || !raw.includes('+')) return '+' + digits;
  return digits;
};

export const getPhoneError = (phone: string): string | null =>
  /^\+?\d+$/.test(phone) ? null : 'Некорректный формат номера';

export const priorityColor = (p: string) =>
  p === 'URGENT' || p === 'HIGH'
    ? 'bg-red-100 text-red-700 border-red-200'
    : p === 'MEDIUM'
      ? 'bg-yellow-100 text-yellow-700 border-yellow-200'
      : 'bg-green-100 text-green-700 border-green-200';

export const statusLabel = (s: string) =>
  s === 'TODO' ? 'To Do' : s === 'IN_PROGRESS' ? 'In Progress' : 'Done';
