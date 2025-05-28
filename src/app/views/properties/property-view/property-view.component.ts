import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { PropertyService } from '../../../services/property.service';
import { UserService } from '../../../services/user.service';
import { AuthService } from '../../../services/auth.service';
import { Property, PropertyStatus } from '../../../models/property.model';
import { User, UserRole } from '../../../models/user.model';
import { ConfirmationService, MenuItem, MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TabViewModule } from 'primeng/tabview';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessagesModule } from 'primeng/messages';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-property-view',
  standalone: true,
  imports: [
CommonModule,
    RouterModule,
    ToastModule,
    ConfirmDialogModule,
    CardModule,
    TableModule,
    TabViewModule,
    ButtonModule,
    MenuModule,
    ProgressSpinnerModule,
    MessagesModule,
    DatePipe
  ],
  templateUrl: './property-view.component.html',
  styleUrls: ['./property-view.component.scss'],
  providers: [ConfirmationService, MessageService]
})
export class PropertyViewComponent implements OnInit {
  property: Property | null = null;
  loading = true;
  error: string | null = null;
  selectedManagerId!: number;
  availableAgents: User[] = [];
  availableAgentsMenuItems: MenuItem[] = [];
  agentInputOpen = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private propertyService: PropertyService,
    private userService: UserService,
    public authService: AuthService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService
  ) { }

  ngOnInit(): void {
    this.loadPropertyData();
  }

  get canEditProperty(): boolean {
    return this.authService.isAdmin();
  }

  get canManageAgents(): boolean {
    return this.authService.isAdmin() || this.authService.isManager();
  }

  private loadPropertyData(): void {
    const propertyId = this.route.snapshot.paramMap.get('id');

    if (!propertyId) {
      this.error = 'ID da propriedade não fornecido';
      this.loading = false;
      return;
    }

    this.propertyService.getPropertyById(+propertyId)
      .subscribe({
        next: (property) => {
          this.property = property;
          this.selectedManagerId = property.managers[0]?.managerId;
          this.loading = false;
        },
        error: (err) => {
          this.error = 'Erro ao carregar propriedade';
          this.loading = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Erro',
            detail: 'Falha ao carregar dados da propriedade'
          });
        }
      });
  }

  getStatusBadgeClass(status: PropertyStatus): string {
    switch (status) {
      case PropertyStatus.ACTIVE: return 'bg-green-100 text-green-800';
      case PropertyStatus.INACTIVE: return 'bg-red-100 text-red-800';
      case PropertyStatus.PENDING: return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  getStatusDisplayName(status: PropertyStatus): string {
    switch (status) {
      case PropertyStatus.ACTIVE: return 'Ativo';
      case PropertyStatus.INACTIVE: return 'Inativo';
      case PropertyStatus.PENDING: return 'Pendente';
      default: return 'Desconhecido';
    }
  }

  editProperty(): void {
    if (this.property) {
      this.router.navigate([`/properties/${this.property.id}/edit`]);
    }
  }

  openAddAgentDialog(): void {
    if (!this.selectedManagerId) return;

    this.userService.getAvailableAgents(this.selectedManagerId)
      .subscribe((agents: User[]) => {
        this.availableAgents = agents;
        this.availableAgentsMenuItems = agents.map(agent => ({
          label: agent.name,
          command: () => this.handleAddAgent(agent.id)
        }));
        this.agentInputOpen = true;
      });
  }

  handleAddAgent(agentId: number): void {
    if (!this.property || !this.selectedManagerId) return;

    this.propertyService.addAgentToManager(this.property.id, this.selectedManagerId, agentId)
      .subscribe({
        next: () => {
          this.loadPropertyData();
          this.messageService.add({
            severity: 'success',
            summary: 'Sucesso',
            detail: 'Corretor adicionado com sucesso'
          });
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Erro',
            detail: 'Falha ao adicionar corretor'
          });
        }
      });

    this.agentInputOpen = false;
  }

  confirmRemoveManager(managerId: number): void {
    this.confirmationService.confirm({
      message: 'Tem certeza que deseja desvincular este gestor do empreendimento? Todos os corretores associados a este gestor também serão desvinculados.',
      header: 'Remover Gestor',
      acceptLabel: 'Remover',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.handleRemoveManager(managerId)
    });
  }

  handleRemoveManager(managerId: number): void {
    if (!this.property) return;

    this.propertyService.removeManagerFromProperty(this.property.id, managerId)
      .subscribe({
        next: () => {
          this.loadPropertyData();
          this.messageService.add({
            severity: 'success',
            summary: 'Sucesso',
            detail: 'Gestor removido com sucesso'
          });
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Erro',
            detail: 'Falha ao remover gestor'
          });
        }
      });
  }

  confirmRemoveAgent(managerId: number, agentId: number): void {
    this.confirmationService.confirm({
      message: 'Tem certeza que deseja desvincular este corretor do gestor?',
      header: 'Remover Corretor',
      acceptLabel: 'Remover',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.handleRemoveAgent(managerId, agentId)
    });
  }

  handleRemoveAgent(managerId: number, agentId: number): void {
    if (!this.property) return;

    this.propertyService.removeAgentFromManager(this.property.id, managerId, agentId)
      .subscribe({
        next: () => {
          this.loadPropertyData();
          this.messageService.add({
            severity: 'success',
            summary: 'Sucesso',
            detail: 'Corretor removido com sucesso'
          });
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Erro',
            detail: 'Falha ao remover corretor'
          });
        }
      });
  }
}