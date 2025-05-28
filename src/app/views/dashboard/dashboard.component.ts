import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user.service';
import { PropertyService } from '../../services/property.service';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './dashboard.component.html'
})
export class DashboardComponent implements OnInit {
    userCount = 0;
    adminCount = 0;
    managerCount = 0;
    brokerCount = 0;
    propertyCount = 0;
    clientCount = 125; // Exemplo
    salesCount = 42; // Exemplo
    loading = true;

    // Dados de exemplo para atividades
    activities = [
        {
            status: 'Novo cliente cadastrado',
            content: 'João Silva foi cadastrado no sistema',
            date: new Date(Date.now() - 3600000)
        },
        {
            status: 'Proposta enviada',
            content: 'Proposta para o empreendimento Vista Verde foi enviada',
            date: new Date(Date.now() - 7200000)
        },
        {
            status: 'Visita agendada',
            content: 'Visita ao empreendimento Jardins marcada para 15/05',
            date: new Date(Date.now() - 86400000)
        }
    ];

    constructor(
        public authService: AuthService,
        private userService: UserService,
        private propertyService: PropertyService
    ) { }

    ngOnInit(): void {
        this.loadData();
    }

    private loadData(): void {
        this.userService.getUsers()
            .pipe(finalize(() => this.loading = false))
            .subscribe({
                next: (users) => {
                    this.userCount = users.length;
                    this.adminCount = users.filter(u => u.role === 'ADMINISTRADOR').length;
                    this.managerCount = users.filter(u => u.role === 'GESTOR').length;
                    this.brokerCount = users.filter(u => u.role === 'CORRETOR').length;
                },
                error: () => this.showError('Falha ao carregar usuários')
            });

        this.propertyService.getProperties()
            .subscribe({
                next: (properties) => this.propertyCount = properties.length,
                error: () => this.showError('Falha ao carregar empreendimentos')
            });
    }

    private showError(message: string): void {
        console.error(message);
        // Implementar notificação para o usuário
    }
}