export const formatPhoneInput = (raw: string): string => {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  return '+' + digits;
};

export const priorityColor = (p: string) =>
  p === 'URGENT' || p === 'HIGH'
    ? 'bg-red-100 text-red-700 border-red-200'
    : p === 'MEDIUM'
      ? 'bg-yellow-100 text-yellow-700 border-yellow-200'
      : 'bg-green-100 text-green-700 border-green-200';

export const statusLabel = (s: string) =>
  s === 'TODO' ? 'To Do' : s === 'IN_PROGRESS' ? 'In Progress' : 'Done';
