import { Campaign } from "./campaing.model";

export interface CampaignPaginadoResponse {
    content: Campaign[];
    totalElements: number;
    totalPages: number;
    number: number;
    size: number;
}