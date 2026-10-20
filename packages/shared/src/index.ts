export * from './phone';
export * from './text';
export * from './checkout';
export * from './status';

export type AuthUser = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: 'USER' | 'ADMIN';
};
