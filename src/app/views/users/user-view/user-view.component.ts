import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { finalize } from 'rxjs';
import { UserService } from '../../../services/user.service';
import { PropertyService } from '../../../services/property.service';
import { User, UserRole } from '../../../models/user.model';
import { Property } from '../../../models/property.model';
import { AuthService } from '../../../services/auth.service';
import { MessageService } from 'primeng/api';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { CardModule } from 'primeng/card';
import { ToastModule } from 'primeng/toast';
import { TagSeverity } from '../../../types/severity-types';

@Component({
    selector: 'app-user-view',
    standalone: true,
    imports: [CommonModule, DatePipe, TagModule, TableModule, CardModule, RouterModule, ToastModule],
    templateUrl: './user-view.component.html',
    styleUrls: ['./user-view.component.scss']
})
export class UserViewComponent implements OnInit {
    user!: User;
    managedProperties: Property[] = [];
    loading = true;

    constructor(
        private route: ActivatedRoute,
        private userService: UserService,
        private propertyService: PropertyService,
        public authService: AuthService,
        private messageService: MessageService
    ) { }

    ngOnInit(): void {
        const userId = this.route.snapshot.paramMap.get('id');
        if (userId) {
            this.loadUser(Number(userId));
        }
    }

    private loadUser(id: number): void {
        this.loading = true;
        this.userService.getUserById(id)
            .pipe(finalize(() => this.loading = false))
            .subscribe({
                next: (user) => {
                    if (user) {
                        this.user = user;
                        this.loadManagedProperties(id);
                    }
                    this.loading = false;
                },
                error: () => {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Erro',
                        detail: 'Falha ao carregar usuário',
                        life: 5000
                    });
                }
            });
    }

    private loadManagedProperties(userId: number): void {
        this.propertyService.getProperties()
            .subscribe({
                next: (properties) => {
                    if (this.user?.role === UserRole.MANAGER) {
                        this.managedProperties = properties.filter(p => p.managers.some(m => m.managerId === userId));
                    } else if (this.user?.role === UserRole.AGENT) {
                        this.managedProperties = properties.filter(p => p.agents?.includes(userId));
                    }
                },
                error: () => {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Erro',
                        detail: 'Falha ao carregar empreendimentos',
                        life: 5000
                    });
                }
            });
    }

    getRoleSeverity(role: UserRole): TagSeverity {
        switch (role) {
            case UserRole.ADMIN: return 'danger';
            case UserRole.MANAGER: return 'info';
            case UserRole.AGENT: return 'success';
            default: return 'warning';
        }
    }

    getRoleBadgeClass(role: UserRole): string {
        switch (role) {
            case UserRole.ADMIN: return 'bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium';
            case UserRole.MANAGER: return 'bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium';
            case UserRole.AGENT: return 'bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium';
            default: return 'bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium';
        }
    }

    getStatusBadgeClass(isActive: boolean): string {
        return isActive
            ? 'bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium'
            : 'bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium';
    }
}