export enum CampaignStatus {
    ACTIVE = 'ACTIVE',
    INACTIVE = 'INACTIVE',
    SCHEDULED = 'SCHEDULED',
    EXPIRED = 'EXPIRED'
}

export interface Campaign {
    id: number;
    name: string;
    description: string;
    code: string;
    status: CampaignStatus;
    isAtivo: boolean;
    createdAt: Date;
    updatedAt: Date;
    property?: {
        propertyId: number;
        name: string;
    };
}

export interface CampaignCreateDto {
    name: string;
    description: string;
    code: string;
    status: CampaignStatus;
    propertyId?: number;
}

export interface CampaignUpdateDto {
    name?: string;
    description?: string;
    code?: string;
    status?: CampaignStatus;
    isAtivo?: boolean;
    propertyId?: number;
}