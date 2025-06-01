import { Pipe, PipeTransform } from '@angular/core';
import { UserRole } from '../models/user.model';

@Pipe({
    name: 'translateRole',
    standalone: true
})
export class TranslateRolePipe implements PipeTransform {
    transform(role: UserRole): string {
        switch (role) {
            case UserRole.ADMIN: return 'Administrador';
            case UserRole.MANAGER: return 'Gerente';
            case UserRole.AGENT: return 'Corretor';
            default: return role;
        }
    }
}