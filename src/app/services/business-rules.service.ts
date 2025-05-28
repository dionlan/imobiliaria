import { Injectable } from '@angular/core';
import { UserService } from './user.service';
import { PropertyService } from './property.service';
import { User, UserRole } from '../models/user.model';
import { Property } from '../models/property.model';

@Injectable({ providedIn: 'root' })
export class BusinessRulesService {
    constructor(
        private userService: UserService,
        private propertyService: PropertyService
    ) { }

    // Verifica se um gestor pode ser removido de um empreendimento
    canRemoveManagerFromProperty(propertyId: number, managerid: number): Promise<boolean> {
        return new Promise((resolve) => {
            this.propertyService.getPropertyById(propertyId).subscribe(property => {
                if (!property || property.managers.length <= 1) {
                    resolve(false);
                    return;
                }
                resolve(true);
            });
        });
    }

    // Obtém todos os corretores disponíveis para um gestor
    getAvailableAgentsForManager(managerId: number): Promise<User[]> {
        return new Promise((resolve) => {
            this.userService.getUsersByRole(UserRole.AGENT).subscribe(agents => {
                const availableAgents = agents.filter(agent =>
                    !agent.managers || !agent.managers.includes(managerId)
                );
                resolve(availableAgents);
            });
        });
    }

    // Valida se um empreendimento pode ser criado/editado
    validateProperty(property: Partial<Property>): { valid: boolean; message?: string } {
        if (!property.managers || property.managers.length === 0) {
            return { valid: false, message: 'Pelo menos um gestor deve ser vinculado' };
        }
        return { valid: true };
    }
}