import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { PropertyService } from '../../../services/property.service';
import { UserService } from '../../../services/user.service';
import { AuthService } from '../../../services/auth.service';
import { Property, PropertyStatus, PropertyManager, PropertyAgent } from '../../../models/property.model';
import { User, UserRole } from '../../../models/user.model';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TagSeverity } from '../../../types/severity-types';
import { finalize, map, switchMap } from 'rxjs';

@Component({
  selector: 'app-property-view',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ToastModule,
    ConfirmDialogModule,
    DatePipe
  ],
  templateUrl: './property-view.component.html',
  styleUrls: ['./property-view.component.scss'],
  providers: [ConfirmationService, MessageService]
})
export class PropertyViewComponent implements OnInit {
  property: Property | null = null;
  loading = true;
  loadingAgents = false;
  error: string | null = null;
  selectedManagerIndex = 0;
  availableManagers: User[] = [];
  availableAgents: User[] = [];
  showAddManagerDialog = false;
  showAddAgentDialog = false;
  availableUnits: number = 15; // Substitua pelo valor real
  totalUnits: number = 50;    // Substitua pelo valor real

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private propertyService: PropertyService,
    private userService: UserService,
    public authService: AuthService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
  ) { }

  ngOnInit(): void {
    this.loadPropertyData();
  }

  get canEditProperty(): boolean {
    return this.authService.hasRole(UserRole.ADMIN);
  }

  get canManageTeam(): boolean {
    return this.authService.hasRole(UserRole.ADMIN) || this.authService.hasRole(UserRole.MANAGER);
  }

  get selectedManager(): PropertyManager | null {
    if (!this.property || !this.property.managers.length) return null;
    return this.property.managers[this.selectedManagerIndex];
  }

  get totalAgents(): number {
    if (!this.property) return 0;
    return this.property.managers.reduce((total, manager) => total + manager.agents.length, 0);
  }

  loadPropertyData(): void {
    const propertyId = this.route.snapshot.paramMap.get('id');

    if (!propertyId) {
      this.error = 'ID do empreendimento não fornecido';
      this.loading = false;
      return;
    }

    this.loading = true;
    this.propertyService.getPropertyByIdNovo(+propertyId).pipe(
      finalize(() => this.loading = false)
    ).subscribe({
        next: (property) => {
          this.property = property;
          console.log('EMPREENDIMENTO VISUALIZADO: ', this.property);
          this.loadAvailableManagers();
      }, error: (err) => {
        this.error = 'Erro ao carregar dados do empreendimento';
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: 'Falha ao carregar empreendimento',
          life: 5000
        });
      }
    });
  }

  loadAvailableManagers(): void {
    if (!this.property) return;

    this.userService.getUsersByRole(UserRole.MANAGER).subscribe({
      next: (managers) => {
        // Filtra gestores já vinculados
        this.availableManagers = managers.filter(manager =>
          !this.property!.managers.some(m => m.managerId === manager.id)
        );
        console.log('GESTORES DISPONÍVEIS VISUALIZAÇÃO: ', this.availableManagers)
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: 'Falha ao carregar gestores disponíveis',
          life: 5000
        });
      }
    });
  }

  loadAvailableAgents(): void {
    if (!this.selectedManager) return;

    this.loadingAgents = true;
    this.userService.getAvailableAgents(this.selectedManager.managerId).pipe(
      finalize(() => this.loadingAgents = false)
    ).subscribe({
      next: (agents) => {
        this.availableAgents = agents;
        this.showAddAgentDialog = true;
        console.log('CORETORES DISPONÍVEIS VISUALIZAÇÃO: ', this.availableManagers)
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: 'Falha ao carregar corretores disponíveis',
          life: 5000
        });
      }
    });
  }

  /* getStatusBadgeClass(status: PropertyStatus): string {
    switch (status) {
      case PropertyStatus.ACTIVE: return 'bg-green-100 text-green-800';
      case PropertyStatus.INACTIVE: return 'bg-red-100 text-red-800';
      case PropertyStatus.PENDING: return 'bg-yellow-100 text-yellow-800';
      case PropertyStatus.MAINTENANCE: return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  } */

  editProperty(): void {
    if (this.property) {
      this.router.navigate([`/properties/${this.property.id}/edit`]);
    }
  }

  openAddAgentDialog(): void {
    if (!this.selectedManager) return;

    this.userService.getAvailableAgents(this.selectedManager.managerId).subscribe({
      next: (agents) => {
        this.availableAgents = agents;
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: 'Falha ao carregar corretores disponíveis'
        });
      }
    });
  }

  addManagerToProperty(managerId: number): void {
    if (!this.property) return;

    this.propertyService.addManagerToProperty(this.property.id, managerId).subscribe({
      next: () => {
        this.loadPropertyData();
        this.showAddManagerDialog = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Sucesso',
          detail: 'Gestor vinculado com sucesso',
          life: 5000
        });
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: 'Falha ao vincular gestor',
          life: 5000
        });
      }
    });
  }

  addAgentToManager(agentId: number): void {
    if (!this.property || !this.selectedManager) return;

    this.propertyService.addAgentToManager(
      this.property.id,
      this.selectedManager.managerId,
      agentId
    ).subscribe({
      next: () => {
        this.loadPropertyData();
        this.showAddAgentDialog = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Sucesso',
          detail: 'Corretor vinculado com sucesso',
          life: 5000
        });
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: 'Falha ao vincular corretor',
          life: 5000
        });
      }
    });
  }

  confirmRemoveManager(managerId: number): void {
    if (!this.property) return;

    if (this.property.managers.length <= 1) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Aviso',
        detail: 'O empreendimento deve ter pelo menos um gestor',
        life: 5000
      });
      return;
    }

    this.confirmationService.confirm({
      message: 'Tem certeza que deseja remover este gestor? Todos os corretores vinculados também serão removidos.',
      header: 'Confirmar Remoção',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Remover',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.removeManager(managerId)
    });
  }

  removeManager(managerId: number): void {
    if (!this.property) return;

    this.propertyService.removeManagerFromProperty(this.property.id, managerId).subscribe({
      next: () => {
        // Atualiza a lista de gestores localmente antes de recarregar
        this.property!.managers = this.property!.managers.filter(m => m.managerId !== managerId);

        // Ajusta o índice selecionado se necessário
        if (this.selectedManagerIndex >= this.property!.managers.length) {
          this.selectedManagerIndex = Math.max(0, this.property!.managers.length - 1);
        }

        this.messageService.add({
          severity: 'success',
          summary: 'Sucesso',
          detail: 'Gestor removido com sucesso',
          life: 5000
        });

        // Recarrega os gestores disponíveis
        this.loadAvailableManagers();
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: 'Falha ao remover gestor',
          life: 5000
        });
      }
    });
  }

  confirmRemoveAgent(agentId: number): void {
    if (!this.selectedManager) return;

    this.confirmationService.confirm({
      message: 'Tem certeza que deseja desvincular este corretor?',
      header: 'Confirmar Desvinculação',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Desvincular',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.removeAgent(agentId)
    });
  }

  removeAgent(agentId: number): void {
    if (!this.property || !this.selectedManager) return;

    this.propertyService.removeAgentFromManager(
      this.property.id,
      this.selectedManager.managerId,
      agentId
    ).subscribe({
      next: () => {
        this.loadPropertyData();
        this.messageService.add({
          severity: 'success',
          summary: 'Sucesso',
          detail: 'Corretor desvinculado com sucesso',
          life: 5000
        });
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: 'Falha ao desvincular corretor',
          life: 5000
        });
      }
    });
  }

  getStatusSeverity(status: PropertyStatus): string {
    switch (status) {
      case PropertyStatus.ACTIVE: return 'success';
      case PropertyStatus.INACTIVE: return 'danger';
      case PropertyStatus.PENDING: return 'warning';
      case PropertyStatus.MAINTENANCE: return 'info';
      default: return null as any;
    }
  }

  getRoleSeverity(status: PropertyStatus): TagSeverity {
    switch (status) {
      case PropertyStatus.ACTIVE: return 'success';
      case PropertyStatus.INACTIVE: return 'danger';
      case PropertyStatus.PENDING: return 'warning';
      case PropertyStatus.MAINTENANCE: return 'info';
      default: return 'warning';
    }
  }

  getStatusDisplayName(status: string | undefined): string {
    if (!status) return 'Indefinido';

    switch (status) {
      case 'ACTIVE': return 'Ativo';
      case 'INACTIVE': return 'Inativo';
      case 'PENDING': return 'Pendente';
      case 'MAINTENANCE': return 'Em Manutenção';
      default: return 'Desconhecido';
    }
  }

    getStatusBadgeClass(status: string): string {
    if (!status) return 'Indefinido'; // Adicione esta verificação
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800';
      case 'INACTIVE': return 'bg-red-100 text-red-800';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'MAINTENANCE': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  /* getStatusDisplayName(status: PropertyStatus): string {
    switch (status) {
      case PropertyStatus.ACTIVE: return 'Ativo';
      case PropertyStatus.INACTIVE: return 'Inativo';
      case PropertyStatus.PENDING: return 'Pendente';
      case PropertyStatus.MAINTENANCE: return 'Em Manutenção';
      default: return 'Desconhecido';
    }
  } */

  trackByManagerId(index: number, manager: PropertyManager): number {
    return manager.managerId;
  }

  trackByAgentId(index: number, agent: any): number {
    return agent.agentId;
  }

  trackByUserId(index: number, user: User): number {
    return user.id;
  }
}