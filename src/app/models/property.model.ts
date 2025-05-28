export enum PropertyStatus {
  ACTIVE = 'ATIVO',
  INACTIVE = 'INATIVO',
  PENDING = 'PENDENTE',
  MAINTENANCE = 'EM_MANUTENCAO'
}

export interface PropertyManager {
  managerId: number;
  agents: { agentId: number }[];
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
  managers: PropertyManager[]; // Agora com estrutura mais completa
  agents?: number[]; // IDs dos corretores vinculados (opcional)
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  imageUrl?: string;
  images?: string[];
}