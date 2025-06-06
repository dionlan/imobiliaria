import { Property } from "./property.model";
import { Seller } from "./seller";

export enum UserRole {
  ADMIN = 'ADMINISTRADOR',
  MANAGER = 'GESTOR',
  AGENT = 'CORRETOR',
}

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  managers?: number[]; // Para corretores - IDs dos gestores vinculados
  managedProperties?: number[]; // Para gestores - IDs dos empreendimentos que gerenciam
  //managedAgents?: Seller[]; // Apenas para gestores
  // Para gestores - armazena os IDs dos corretores que ele gerencia
  managedAgents?: number[]; // ou string[] se estiver usando UUIDs
  // Para corretores - armazena o ID do gestor que o gerencia (opcional)
  managerId?: number | null; // ou string se estiver usando UUIDs
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  profileImage?: string;
  token?: string;
  properties?: Property[]; // Empreendimentos vinculados
}