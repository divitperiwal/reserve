const weekday = new Intl.DateTimeFormat('en-IN', { weekday: 'short' });

function clock(d: Date) {
  const h = d.getHours();
  const m = d.getMinutes();
  return `${h % 12 || 12}${m ? `:${String(m).padStart(2, '0')}` : ''} ${h < 12 ? 'am' : 'pm'}`;
}

export function slotWords(from: string, until: string) {
  const start = new Date(from);
  return `${weekday.format(start)} ${clock(start)} to ${clock(new Date(until))}`;
}

export const pointRadius = (kg: number) => Math.max(5, Math.min(28, 4 + 2.5 * Math.sqrt(kg)));
