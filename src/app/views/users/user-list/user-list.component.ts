import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { finalize } from 'rxjs';
import { User, UserRole } from '../../../models/user.model';
import { Pagination } from '../../../models/pagination.model';
import { UserService } from '../../../services/user.service';
import { AuthService } from '../../../services/auth.service';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { PasswordResetDialogComponent } from '../../../components/shared/password-reset-dialog/password-reset-dialog.component';
import { AdvancedFilterComponent } from '../../../components/shared/advanced-filter/advanced-filter.component';
import { TranslateRolePipe } from '../../../pipes/translate-role.pipe';
import { FilterCriteria } from '../../../components/shared/advanced-filter/model/filter-criteria';

@Component({
    selector: 'app-user-list',
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        ToastModule,
        PasswordResetDialogComponent,
        AdvancedFilterComponent,
        TranslateRolePipe
    ],
    templateUrl: './user-list.component.html',
    providers: [ConfirmationService, MessageService]
})
export class UserListComponent implements OnInit {
    users: User[] = [];
    result: any[] = [];
    filteredUsers: User[] = [];
    loading = true;
    selectedUser: User | null = null;
    showResetDialog = false;
    sortField = 'name';
    sortOrder = 1; // 1 para ascendente, -1 para descendente

    pagination: Pagination = {
        page: 1,
        pageSize: 10,
        totalRecords: 0
    };

    constructor(
        private userService: UserService,
        public authService: AuthService,
        private confirmationService: ConfirmationService,
        private messageService: MessageService,
        private router: Router
    ) { }

    ngOnInit(): void {
        this.loadUsers();

        // Recarrega usuários quando a rota é ativada (volta da edição)
        this.router.events.subscribe(() => {
            if (this.router.url === '/users') {
                this.loadUsers();
            }
        });
    }

    loadUsers(): void {
        this.loading = true;
        this.userService.getUsersNovo()
            .pipe(finalize(() => this.loading = false))
            .subscribe({
                next: (users) => {
                    this.users = this.filterUsersByRole(users);
                    console.log('USUÁRIOS: ', this.result);
                    this.applySorting();
                    this.pagination.totalRecords = this.users.length;
                },
                error: () => this.showErrorMessage('Falha ao carregar usuários')
            });
    }

    applySorting(): void {
        this.filteredUsers = [...this.users].sort((a, b) => {
            const valueA = a[this.sortField as keyof User];
            const valueB = b[this.sortField as keyof User];

            if (valueA === undefined || valueA === null) return 1 * this.sortOrder;
            if (valueB === undefined || valueB === null) return -1 * this.sortOrder;

            return String(valueA).localeCompare(String(valueB)) * this.sortOrder;
        });
    }

    applyFilter(filter: FilterCriteria): void {
        // Se não houver filtro ou todos os campos estiverem vazios, retorna todos os usuários
        if (!filter || Object.keys(filter).every(key => !filter[key as keyof FilterCriteria])) {
            this.filteredUsers = [...this.users];
            this.pagination.totalRecords = this.filteredUsers.length;
            this.pagination.page = 1;
            return;
        }

        this.filteredUsers = this.users.filter(user => {
            // Filtro por texto (nome ou email)
            const matchesSearch = !filter.searchTerm ||
                [user.name, user.email]
                    .some(field => field?.toLowerCase().includes(filter.searchTerm!.toLowerCase()));

            // Filtro por status (ativo/inativo)
            const matchesStatus = !filter.status ||
                user.isActive === (filter.status === 'active');

            // Filtro por role (papel)
            const matchesRole = !filter.role ||
                user.role === filter.role;

            return matchesSearch && matchesStatus && matchesRole;
        });

        this.pagination.totalRecords = this.filteredUsers.length;
        this.pagination.page = 1;
    }

    sort(field: string): void {
        if (this.sortField === field) {
            this.sortOrder *= -1;
        } else {
            this.sortField = field;
            this.sortOrder = 1;
        }

        this.filteredUsers.sort((a, b) => {
            const valueA = a[field as keyof User];
            const valueB = b[field as keyof User];

            if (valueA === undefined && valueB === undefined) return 0;
            if (valueA === undefined) return 1 * this.sortOrder;
            if (valueB === undefined) return -1 * this.sortOrder;

            if (valueA === null && valueB !== null) return 1 * this.sortOrder;
            if (valueA !== null && valueB === null) return -1 * this.sortOrder;
            if (valueA === null && valueB === null) return 0;
            if (valueA! < valueB!) return -1 * this.sortOrder;
            if (valueA! > valueB!) return 1 * this.sortOrder;
            return 0;
        });
    }

    private filterUsersByRole(users: User[]): User[] {
        if (this.authService.isAdmin()) {
            return users;
        } else if (this.authService.isManager()) {
            return users.filter(u => u.role === UserRole.AGENT);
        }
        return [];
    }

    getRoleBadgeClass(role: UserRole): string {
        switch (role) {
            case UserRole.ADMIN: return 'bg-red-100 text-red-800';
            case UserRole.MANAGER: return 'bg-blue-100 text-blue-800';
            case UserRole.AGENT: return 'bg-green-100 text-green-800';
            default: return 'bg-yellow-100 text-yellow-800';
        }
    }

    getStatusBadgeClass(isActive: boolean): string {
        return isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
    }

    confirmDelete(user: User): void {
        this.confirmationService.confirm({
            message: `Deseja realmente excluir o usuário ${user.name}?`,
            header: 'Confirmar Exclusão',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Sim',
            rejectLabel: 'Não',
            accept: () => this.deleteUser(user)
        });
    }

    deleteUser(user: User): void {
        this.loading = true;
        this.userService.deleteUser(user.id)
            .pipe(finalize(() => this.loading = false))
            .subscribe({
                next: () => {
                    this.showSuccessMessage('Usuário excluído com sucesso');
                    this.loadUsers();
                },
                error: () => this.showErrorMessage('Falha ao excluir usuário')
            });
    }

    onPasswordReset(): void {
        this.showSuccessMessage('Senha redefinida com sucesso');
        this.showResetDialog = false;
    }

    openResetPassword(user: User): void {
        this.selectedUser = user;
        this.showResetDialog = true;
    }

    changePage(page: number): void {
        this.pagination.page = page;
    }

    get pages(): number[] {
        const totalPages = Math.ceil(this.pagination.totalRecords / this.pagination.pageSize);
        return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    editUser(userId: number): void {
        this.router.navigate(['/users', userId, 'edit']);
    }

    navigateToCreate(): void {
        this.router.navigate(['/users/new']);
    }

    private showSuccessMessage(message: string): void {
        this.messageService.add({
            severity: 'success',
            summary: 'Sucesso',
            detail: message,
            life: 5000
        });
    }

    private showErrorMessage(message: string): void {
        this.messageService.add({
            severity: 'error',
            summary: 'Erro',
            detail: message,
            life: 5000
        });
    }
}