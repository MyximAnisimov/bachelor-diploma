import { api } from './http';

export interface AuthUser {
  id: number;
  email: string;
  name: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export async function register(email: string, password: string, name: string) {
  const res = await api.post<AuthResponse>('/api/auth/register', {
    email,
    password,
    name,
  });
  return res.data;
}

export async function login(email: string, password: string) {
  const res = await api.post<AuthResponse>('/api/auth/login', {
    email,
    password,
  });
  return res.data;
}

export async function getCurrentUser(): Promise<UserDto | null> {
  try {
    const res = await api.get<UserDto>('/api/auth/me');
    return res.data;
  } catch (e: any) {
    if (e.response?.status === 401) {
      return null;
    }
    throw e;
  }
}