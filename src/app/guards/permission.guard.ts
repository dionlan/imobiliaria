import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models/user.model';

export const PermissionGuard: CanActivateFn = (route) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    const requiredRoles = route.data['roles'] as UserRole[];
    const user = authService.getCurrentUser();

    if (!user || !requiredRoles.includes(user.role)) {
        router.navigate(['/dashboard']);
        return false;
    }
    return true;
};