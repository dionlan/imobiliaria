import { User } from "./user.model";

export enum PropertyStatus {
  ACTIVE = 'ACTIVE',        // Alterado para corresponder ao backend
  INACTIVE = 'INACTIVE',    // Alterado para corresponder ao backend
  PENDING = 'PENDING',      // Alterado para corresponder ao backend
  MAINTENANCE = 'MAINTENANCE' // Alterado para corresponder ao backend
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