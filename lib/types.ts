// Auth types used by API routes

export interface LoginRequestBody {
  email: string;
  password: string;
  checkOnly?: boolean;
}

export interface LoginResponse {
  token: string;
  role: string;
  name: string;
  id: string;
  avatar: string | null;
}

export interface RegisterBody {
  name: string;
  email: string;
  password: string;
}
