export enum UserRole {
  ADMIN = 'ADMINISTRADOR',
  MANAGER = 'GESTOR',
  AGENT = 'CORRETOR'
}

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  managers?: number[]; // Para corretores - IDs dos gestores vinculados
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  profileImage?: string;
  token?: string;
}