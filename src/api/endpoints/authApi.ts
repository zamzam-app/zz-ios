import client from '../client';

export interface AuthUser {
  _id?: string;
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'user';
}

interface LoginResponse {
  access_token: string;
  refresh_token?: string;
}

export const authApi = {
  login: async (
    identifier: string,
    password: string,
    isAdminLogin: boolean,
  ): Promise<LoginResponse> => {
    const payload = isAdminLogin
      ? { email: identifier, password }
      : { userName: identifier, password };

    const { data } = await client.post<LoginResponse>('/auth/login', payload);
    return data;
  },

  getProfile: async (): Promise<AuthUser> => {
    const { data } = await client.get<AuthUser>('/auth/profile');
    return data;
  },

  logout: async (): Promise<void> => {
    await client.post('/auth/logout');
  },
};
