import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ApiError } from '../../lib/api';
import { homeFor, useAuth } from '../../lib/auth';
import type { AuthResponse, Role } from '../../lib/types';

export type Errors = Record<string, string | undefined>;

export const PHONE_ERROR = 'Enter a valid 10-digit mobile number';
export const validPhone = (p: string) => /^\d{10}$/.test(p);
export const digits = (v: string, max: number) => v.replace(/\D/g, '').slice(0, max);

export function fromState(state: unknown): string | undefined {
  const from = (state as { from?: unknown } | null)?.from;
  return typeof from === 'string' && from.startsWith('/') && !from.startsWith('/auth') ? from : undefined;
}

export function parseRole(v: string | null | undefined): Role | undefined {
  const r = v?.toUpperCase();
  return r === 'DONOR' || r === 'VOLUNTEER' || r === 'NGO' ? r : undefined;
}

export function useFinishAuth() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  return useCallback(
    (res: AuthResponse) => {
      signIn(res);
      navigate(fromState(location.state) ?? homeFor(res.user.role), { replace: true });
    },
    [signIn, navigate, location.state],
  );
}

// Map an API failure to inline field errors, or a form-level message when there are none
export function readError(err: unknown): { fields: Errors; message?: string } {
  if (err instanceof ApiError) {
    if (err.status >= 500) return { fields: {}, message: 'ReServe is not responding right now. Try again in a moment.' };
    if (err.fields && Object.keys(err.fields).length) return { fields: err.fields };
    return { fields: {}, message: err.message };
  }
  return { fields: {}, message: 'Something went wrong. Try again.' };
}

export function focusFirst(order: [field: string, id: string][], errors: Errors) {
  const hit = order.find(([f]) => errors[f]);
  if (hit) requestAnimationFrame(() => document.getElementById(hit[1])?.focus());
}
