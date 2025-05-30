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
    }

    loadUsers(): void {
        this.loading = true;
        this.userService.getUsers()
            .pipe(finalize(() => this.loading = false))
            .subscribe({
                next: (users) => {
                    this.users = this.filterUsersByRole(users);
                    this.filteredUsers = [...this.users];
                    this.pagination.totalRecords = this.users.length;
                    this.sort(this.sortField); // Aplica ordenação inicial
                },
                error: () => this.showErrorMessage('Falha ao carregar usuários')
            });
    }

    applyFilter(filter: any): void {
        if (!filter || Object.keys(filter).length === 0) {
            this.filteredUsers = [...this.users];
            return;
        }

        this.filteredUsers = this.users.filter(user => {
            const matchesSearch = filter.searchTerm ?
                user.name.toLowerCase().includes(filter.searchTerm.toLowerCase()) ||
                user.email.toLowerCase().includes(filter.searchTerm.toLowerCase()) : true;

            const matchesStatus = filter.status ?
                user.isActive === (filter.status === 'active') : true;

            const matchesRole = filter.role ?
                user.role === filter.role : true;

            return matchesSearch && matchesStatus && matchesRole;
        });

        this.pagination.totalRecords = this.filteredUsers.length;
        this.pagination.page = 1; // Reset para primeira página
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

            if (valueA < valueB) return -1 * this.sortOrder;
            if (valueA > valueB) return 1 * this.sortOrder;
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