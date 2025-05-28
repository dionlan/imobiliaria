import { User, UserRole } from '../models/user.model';
import { Property } from '../models/property.model';

export function filterPropertiesByUser(properties: Property[], user: User | null): Property[] {
    if (!user) return [];

    if (user.role === UserRole.ADMIN) {
        return properties;
    } else if (user.role === UserRole.MANAGER) {
        return properties.filter(p => p.managers.includes(user.id));
    } else if (user.role === UserRole.AGENT) {
        return properties.filter(p =>
            p.agents?.includes(user.id) ||
            p.managers.some(m => user.managers?.includes(m))
        );
    }
    return [];
}

export function formatDate(date: Date | string): string {
    return new Date(date).toLocaleDateString('pt-BR');
}