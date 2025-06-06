import { Company } from "./company";
import { UserRole } from "./user.model";

export interface Seller {
    id: number;
    sellerId: string;
    name: string;
    email: string;
    phone?: string;
    isRecipient: boolean;
    canViewBucket: boolean;
    role: UserRole;
    company: Company;
}