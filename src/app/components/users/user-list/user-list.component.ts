import { Component, OnInit } from '@angular/core';
import { User, UserRole } from '../../../models/user.model';
import { UserService } from '../../../services/user.service';
import { AuthService } from '../../../services/auth.service';
import { ConfirmationService, MessageService } from 'primeng/api';

@Component({
  selector: 'app-user-list',
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.scss']
})
export class UserListComponent implements OnInit {
  users: User[] = [];
  loading = true;
  displayDialog = false;
  selectedUser: User | null = null;

  constructor(
    private userService: UserService,
    private authService: AuthService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService
  ) { }

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading = true;
    this.userService.getUsers().subscribe({
      next: (users) => {
        // Filtra usuários conforme perfil
        if (this.authService.hasRole(UserRole.MANAGER)) {
          this.users = users.filter(u => u.role === UserRole.AGENT);
        } else if (this.authService.hasRole(UserRole.AGENT)) {
          this.users = [];
        } else {
          this.users = users;
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: 'Falha ao carregar usuários'
        });
      }
    });
  }

  confirmDelete(user: User): void {
    this.confirmationService.confirm({
      message: `Deseja realmente excluir o usuário ${user.name}?`,
      header: 'Confirmar Exclusão',
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.deleteUser(user)
    });
  }

  private deleteUser(user: User): void {
    // Simulação de exclusão
    this.messageService.add({
      severity: 'success',
      summary: 'Sucesso',
      detail: 'Usuário excluído com sucesso'
    });
    this.loadUsers();
  }

  openResetPasswordDialog(user: User): void {
    this.selectedUser = user;
    this.displayDialog = true;
  }

  resetPassword(newPassword: string): void {
    if (this.selectedUser) {
      this.userService.resetPassword(this.selectedUser.id, newPassword).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Sucesso',
            detail: 'Senha redefinida com sucesso'
          });
          this.displayDialog = false;
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Erro',
            detail: 'Falha ao redefinir senha'
          });
        }
      });
    }
  }
}