export const normalizeName = (value: string) => (value || '').toLowerCase().trim().replace(/\s+/g, ' ');

export const toNumber = (value: unknown) => {
  const parsed = typeof value === 'number' ? value : parseFloat(String(value || '0').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
};

export const apiValue = (source: any, key: string) => toNumber(source?.[key]);