import { User } from "./user.model";

export enum PropertyStatus {
  ACTIVE = 'ATIVO',
  INACTIVE = 'INATIVO',
  PENDING = 'PENDENTE',
  MAINTENANCE = 'EM_MANUTENCAO'
}

export interface PropertyAgent {
  agentId: number;
  agent?: User; // Dados completos do corretor (populado posteriormente)
}

export interface PropertyManager {
  managerId: number;
  manager?: User; // Dados completos do gestor (populado posteriormente)
  agents: PropertyAgent[];
}

export interface Property {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  description: string;
  status: PropertyStatus;
  managers: PropertyManager[];
  agents?: number[]; // IDs dos corretores vinculados (opcional)
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  imageUrl?: string;
  images?: string[];
}