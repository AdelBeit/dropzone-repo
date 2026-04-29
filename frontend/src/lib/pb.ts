export const PB_URL = process.env.NEXT_PUBLIC_PB_URL ?? 'http://localhost:8090';

export interface PbAuthRecord {
  id: string;
  email: string;
}

export interface PbAuthResponse {
  token: string;
  record: PbAuthRecord;
}

export function getStoredAuth(): { token: string; userId: string; email: string } | null {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem('pb_token');
  const userId = localStorage.getItem('pb_user_id');
  const email = localStorage.getItem('pb_email');
  if (!token || !userId || !email) return null;
  return { token, userId, email };
}

export function saveAuth(data: PbAuthResponse) {
  localStorage.setItem('pb_token', data.token);
  localStorage.setItem('pb_user_id', data.record.id);
  localStorage.setItem('pb_email', data.record.email);
  document.cookie = 'pb_auth=1; path=/; SameSite=Strict';
}

export function clearAuth() {
  localStorage.removeItem('pb_token');
  localStorage.removeItem('pb_user_id');
  localStorage.removeItem('pb_email');
  document.cookie = 'pb_auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict';
}

export async function pbFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const auth = getStoredAuth();
  const headers = new Headers(options.headers);
  if (auth) headers.set('Authorization', auth.token);
  return fetch(`${PB_URL}${path}`, { ...options, headers });
}
