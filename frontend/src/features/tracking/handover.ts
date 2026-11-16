export interface Handover {
  donationId: number;
  code: string;
}

export const formatHandover = (donationId: number, code: string) => `reserve:${donationId}:${code}`;

export function parseHandover(text: string): Handover | null {
  const m = /^reserve:(\d+):(\d{4})$/.exec(text.trim());
  return m ? { donationId: Number(m[1]), code: m[2]! } : null;
}
