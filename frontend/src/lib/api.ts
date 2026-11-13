import type {
  Activity,
  AuthResponse,
  CreateDonation,
  DashboardStats,
  Donation,
  GeoPoint,
  MyStats,
  NgoRef,
  PublicStats,
  Role,
  User,
} from './types';

const TOKEN_KEY = 'reserve.token';

export class ApiError extends Error {
  status: number;
  fields?: Record<string, string>;
  constructor(status: number, message: string, fields?: Record<string, string>) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

export const tokenStore = {
  get: () => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set: (t: string | null) => {
    try {
      if (t) localStorage.setItem(TOKEN_KEY, t);
      else localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* storage unavailable */
    }
  },
};

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  let res: Response;
  try {
    res = await fetch(`/api${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    throw new ApiError(0, 'Can’t reach ReServe. Check your connection and try again.');
  }
  if (res.status === 401 && token) {
    tokenStore.set(null);
    window.dispatchEvent(new Event('reserve:logout'));
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(res.status, data.message ?? `Request failed (${res.status})`, data.fields);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

function qs(params: Record<string, string | number | undefined | null>) {
  const s = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') s.set(k, String(v));
  });
  const out = s.toString();
  return out ? `?${out}` : '';
}

export interface RegisterInput {
  role: Role;
  name: string;
  phone: string;
  password: string;
  orgType?: string;
  vehicle?: string;
  address: string;
  lat: number;
  lng: number;
}

export interface FeedQuery {
  lat?: number;
  lng?: number;
  radiusKm?: number;
  withinHours?: number;
  diet?: string;
  category?: string;
  sort?: 'expiry' | 'distance';
  q?: string;
}

export const api = {
  register: (input: RegisterInput) => request<AuthResponse>('POST', '/auth/register', input),
  login: (phone: string, password: string) => request<AuthResponse>('POST', '/auth/login', { phone, password }),
  requestOtp: (phone: string) => request<{ sent: boolean; devCode?: string }>('POST', '/auth/otp/request', { phone }),
  verifyOtp: (phone: string, code: string) => request<AuthResponse>('POST', '/auth/otp/verify', { phone, code }),

  me: () => request<User>('GET', '/me'),
  updateMe: (patch: Partial<Pick<User, 'name' | 'address' | 'lat' | 'lng' | 'vehicle' | 'onDuty' | 'acceptingFood'>> & { dropNgoId?: number }) =>
    request<User>('PATCH', '/me', patch),
  nearbyVolunteers: (id: number) => request<{ count: number }>('GET', `/donations/${id}/nearby-volunteers`),
  ngos: () => request<NgoRef[]>('GET', '/ngos'),

  feed: (q: FeedQuery) => request<Donation[]>('GET', `/donations/feed${qs({ ...q })}`),
  mine: () => request<Donation[]>('GET', '/donations/mine'),
  donation: (id: number) => request<Donation>('GET', `/donations/${id}`),
  createDonation: (input: CreateDonation) => request<Donation>('POST', '/donations', input),
  cancelDonation: (id: number) => request<void>('DELETE', `/donations/${id}`),
  accept: (id: number, quantity?: number) => request<Donation>('POST', `/donations/${id}/accept`, { quantity }),
  withdraw: (id: number) => request<Donation>('POST', `/donations/${id}/withdraw`),
  claim: (id: number) => request<Donation>('POST', `/donations/${id}/claim`),
  release: (id: number) => request<Donation>('POST', `/donations/${id}/release`),
  confirmPickup: (id: number, code: string) => request<Donation>('POST', `/donations/${id}/confirm-pickup`, { code }),
  confirmDelivery: (id: number, code: string) => request<Donation>('POST', `/donations/${id}/confirm-delivery`, { code }),
  sendLocation: (id: number, lat: number, lng: number) => request<void>('POST', `/donations/${id}/location`, { lat, lng }),
  route: (id: number) => request<GeoPoint[]>('GET', `/donations/${id}/route`),

  upload: async (file: File): Promise<{ url: string }> => {
    const body = new FormData();
    body.append('file', file);
    const res = await fetch('/api/uploads', { method: 'POST', body, headers: { Authorization: `Bearer ${tokenStore.get() ?? ''}` } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(res.status, data.message ?? 'Upload failed', data.fields);
    return data;
  },

  publicStats: () => request<PublicStats>('GET', '/stats/public'),
  myStats: () => request<MyStats>('GET', '/stats/me'),
  dashboard: (days: 7 | 30) => request<DashboardStats>('GET', `/stats/dashboard?days=${days}`),
  activity: (limit = 20) => request<Activity[]>('GET', `/activity?limit=${limit}`),
  exportUrl: (days: 7 | 30) => `/api/export.csv${qs({ days, token: tokenStore.get() })}`,
  streamUrl: () => `/api/stream${qs({ token: tokenStore.get() })}`,
};
