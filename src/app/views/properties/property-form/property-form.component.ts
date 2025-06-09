import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { PropertyService } from '../../../services/property.service';
import { UserService } from '../../../services/user.service';
import { ActivatedRoute, Router } from '@angular/router';
import { User, UserRole } from '../../../models/user.model';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { finalize, firstValueFrom } from 'rxjs';
import { Property, PropertyAgent, PropertyManager, PropertyStatus } from '../../../models/property.model';
import { CommonModule } from '@angular/common';
import { PropertyManagerAgentRequestDTO } from '../../../models/property-manager-agent';
import { trigger, transition, style, animate } from '@angular/animations';

interface ManagerAgentRelation {
  managerId: number;
  agentIds: number[];
}

// Animations reutilizáveis
const fadeInOut = trigger('fadeInOut', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateY(-8px)' }),
    animate('200ms cubic-bezier(0.4, 0, 0.2, 1)',
      style({ opacity: 1, transform: 'translateY(0)' }))
  ]),
  transition(':leave', [
    animate('150ms cubic-bezier(0.4, 0, 0.2, 1)',
      style({ opacity: 0, transform: 'translateY(-8px)' }))
  ])
]);


@Component({
  selector: 'app-property-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, ToastModule],
  templateUrl: './property-form.component.html',
  styleUrls: ['./property-form.component.scss'],
  providers: [MessageService],
  animations: [fadeInOut]
})
export class PropertyFormComponent implements OnInit {
  form: FormGroup;
  statusControl = new FormControl(true);
  isEdit = false;
  propertyId: number | null = null;
  loading = false;
  loadingAgents = false;

  // Gestores
  managers: User[] = [];
  filteredManagers: User[] = [];
  managerSearchTerm = '';
  error: string | null = null;
  selectedManagerIndex = 0;
  availableManagers: User[] = [];
  availableAgents: User[] = [];
  allManagers: User[] = [];

  // Corretores
  selectedManagersWithAgents: PropertyManager[] = [];
  allAgents: User[] = [];
  filteredAgents: User[] = [];
  agents: User[] = [];
  linkedAgents: User[] = [];
  agentSearchTerm = '';
  filteredAvailableAgents: User[] = [];
  activeManagerForAssignment: number | null = null;
  agentAssignmentSearchTerm = '';
  availableAgentsForAssignment: User[] = [];
  isHoveredAgent: number | null = null;

  property: Property | null = null;
  showAddManagerDialog = false;
  showAddAgentDialog = false;

  // Notificações
  showNotification = false;
  notificationType: 'success' | 'error' | 'warn' = 'success';
  notificationTitle = '';
  notificationMessage = '';
  notificationClass = '';

  // Adicione esta propriedade na classe
  private managerAgentRelations: ManagerAgentRelation[] = [];

  constructor(
    private fb: FormBuilder,
    private propertyService: PropertyService,
    private userService: UserService,
    private route: ActivatedRoute,
    private router: Router,
    private messageService: MessageService
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      address: ['', Validators.required],
      description: [''],
      managers: [[], Validators.required],
      agents: [[]],
      status: [true]
    });
  }

  ngOnInit(): void {
    this.loadAllAgents();
    this.loadAllManagers();
    const idParam = this.route.snapshot.paramMap.get('id');
    this.propertyId = idParam !== null ? Number(idParam) : null;

    if (this.propertyId) {
      this.isEdit = true;
      this.loadPropertyData(this.propertyId);
    }

    this.statusControl.valueChanges.subscribe(value => {
      this.form.get('status')?.setValue(value);
    });
  }

  loadAllAgents(): void {
    this.userService.getAllAgents().subscribe(agents => {
      this.allAgents = agents;
      this.filterAvailableAgents();
    });
  }

  filterAvailableAgents(): void {
    const searchTerm = this.form.get('searchTerm')?.value.toLowerCase() || '';

    this.filteredAvailableAgents = this.allAgents.filter(agent =>
      !this.linkedAgents.some(a => a.id === agent.id) &&
      (agent.name.toLowerCase().includes(searchTerm) ||
        agent.email.toLowerCase().includes(searchTerm)
      ));
  }

  getAvailableAgentsCount(managerId: number): number {
    const currentAgentIds = this.selectedManagersWithAgents
      .find(m => m.managerId === managerId)?.agents.map(a => a.agentId) || [];

    return this.allAgents.filter(agent =>
      !currentAgentIds.includes(agent.id)
    ).length;
  }

  loadPropertyData(propertyId: number): void {
    if (!propertyId) {
      this.error = 'ID do empreendimento não fornecido';
      this.loading = false;
      return;
    }

    this.loading = true;
    this.propertyService.getPropertyByIdNovo(propertyId).pipe(
      finalize(() => this.loading = false)
    ).subscribe({
      next: (property) => {
        this.property = property;

        console.log('EMPREENDIMENTO VISUALIZADO: ', this.property);

        this.selectedManagersWithAgents = property.managers || [];

        // Preenche as relações gestor-corretor
        this.managerAgentRelations = this.selectedManagersWithAgents.map(m => ({
          managerId: m.managerId,
          agentIds: m.agents.map(a => a.agentId)
        }));

        const managerIds = this.selectedManagersWithAgents.map(m => m.managerId);
        const agentIds = this.selectedManagersWithAgents.flatMap(m =>
          m.agents.map(a => a.agentId)
        );

        this.form.patchValue({
          name: property.name,
          address: property.address,
          description: property.description,
          managers: managerIds,
          agents: agentIds,
          status: property.status ?? true
        });

        this.statusControl.setValue(property.status === PropertyStatus.ACTIVE);
        //this.loadAllManagers();
      },
      error: (err) => {
        this.error = 'Erro ao carregar dados do empreendimento';
        this.showError('Falha ao carregar empreendimento');
      }
    });
  }

  // Methods for agent assignment
  openAgentAssignmentForManager(managerId: number, event?: Event): void {
    // Previne o comportamento padrão e a propagação do evento
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    // Alterna o painel (abre/fecha)
    if (this.activeManagerForAssignment === managerId) {
      this.activeManagerForAssignment = null;
    } else {
      this.activeManagerForAssignment = managerId;
      this.agentAssignmentSearchTerm = '';
      this.filterAvailableAgentsForManager(managerId);
    }
  }

  closeAgentAssignment(): void {
    this.activeManagerForAssignment = null;
    this.agentAssignmentSearchTerm = '';
  }

  filterAvailableAgentsForManager(managerId: number): void {
    console.log('ID GESTOR: ', managerId);
    console.log('MANAGERS WITH AGENTS: ', this.selectedManagersWithAgents);
    const currentAgentIds = this.selectedManagersWithAgents
      .find(m => m.managerId === managerId)?.agents.map(a => a.agentId) || [];

    this.availableAgentsForAssignment = this.allAgents.filter(agent =>
      !currentAgentIds.includes(agent.id) &&
      (!this.agentAssignmentSearchTerm ||
        agent.name.toLowerCase().includes(this.agentAssignmentSearchTerm.toLowerCase()) ||
        agent.email.toLowerCase().includes(this.agentAssignmentSearchTerm.toLowerCase()))
    );
  }

  assignAgentToManager(managerId: number, agent: User, event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    const managerIndex = this.selectedManagersWithAgents.findIndex(m => m.managerId === managerId);

    if (managerIndex >= 0) {
      this.selectedManagersWithAgents[managerIndex].agents.push({
        agentId: agent.id,
        agent
      });

      const currentAgents = this.form.get('agents')?.value || [];
      if (!currentAgents.includes(agent.id)) {
        this.form.get('agents')?.setValue([...currentAgents, agent.id]);
      }

      const agentIds = this.selectedManagersWithAgents[managerIndex].agents.map(a => a.agentId);
      this.updateManagerAgentsInBackend({
        propertyId: this.propertyId!,
        managerId,
        agentIds
      });

      this.filterAvailableAgentsForManager(managerId);
    }
  }

  // Helper method (optional)
  isAgentAssignedToOtherManager(agentId: number, currentManagerId: number): boolean {
    return this.selectedManagersWithAgents.some(m =>
      m.managerId !== currentManagerId &&
      m.agents.some(a => a.agentId === agentId)
    );
  }

  loadAllManagers(): void {
    this.userService.getUsersByRole(UserRole.MANAGER).subscribe({
      next: (managers) => {
        this.allManagers = managers;
        console.log('TODOS GESTORES DISPONÍVEIS NA EDIÇÃO: ', this.allManagers);
        this.filteredManagers = [...managers];
      },
      error: () => this.showError('Falha ao carregar gestores')
    });
  }

  filterManagers(): void {
    if (!this.managerSearchTerm) {
      this.filteredManagers = [...this.allManagers];
      return;
    }

    const term = this.managerSearchTerm.toLowerCase();
    this.filteredManagers = this.allManagers.filter(manager =>
      manager.name.toLowerCase().includes(term) ||
      manager.email.toLowerCase().includes(term)
    );
  }

  filterAgents(): void {
    if (!this.agentSearchTerm) {
      this.filteredAgents = [...this.allAgents];
      return;
    }

    const term = this.agentSearchTerm.toLowerCase();
    this.filteredAgents = this.allAgents.filter(agent =>
      agent.name.toLowerCase().includes(term) ||
      agent.email.toLowerCase().includes(term)
    );
  }

  getManagerName(managerId: number): string {
    const manager = this.allManagers.find(m => m.id === managerId);
    return manager?.name || 'Gestor não encontrado';
  }

  toggleAgentAssignmentPanel(managerId: number, event: Event): void {
    event.preventDefault();
    event.stopImmediatePropagation();

    this.activeManagerForAssignment = this.activeManagerForAssignment === managerId ? null : managerId;

    if (this.activeManagerForAssignment) {
      this.agentAssignmentSearchTerm = '';
      this.filterAvailableAgentsForManager(managerId);
    }
  }

  removeAgentFromManager(managerId: number, agentId: number, event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    const managerIndex = this.selectedManagersWithAgents.findIndex(m => m.managerId === managerId);
    if (managerIndex >= 0) {
      this.selectedManagersWithAgents[managerIndex].agents =
        this.selectedManagersWithAgents[managerIndex].agents.filter(a => a.agentId !== agentId);

      const currentAgents = this.form.get('agents')?.value || [];
      this.form.get('agents')?.setValue(currentAgents.filter((id: number) => id !== agentId));

      const agentIds = this.selectedManagersWithAgents[managerIndex].agents.map(a => a.agentId);
      this.updateManagerAgentsInBackend({
        propertyId: this.propertyId!,
        managerId,
        agentIds
      });

      this.filterAvailableAgentsForManager(managerId);
    }
  }


  loadAvailableManagers(): void {
    if (!this.property) return;

    this.userService.getUsersByRole(UserRole.MANAGER).subscribe({
      next: (managers) => {
        // Filtra gestores já vinculados
        this.availableManagers = managers.filter(manager =>
          !this.property!.managers.some(m => m.managerId === manager.id)
        );
        //console.log('GESTORES DISPONÍVEIS VISUALIZAÇÃO: ', this.availableManagers)
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

  loadAgentsForManagers(managerIds: number[]): void {
    this.loadingAgents = true;
    this.userService.getAgentsByManagers(managerIds)
      .pipe(finalize(() => this.loadingAgents = false))
      .subscribe({
        next: (agents) => {
          this.agents = agents;
          this.filteredAgents = [...agents];
          // Mantém seleção existente se possível
          this.updateAgentsSelection();
        },
        error: () => this.showError('Falha ao carregar corretores')
      });
  }

  /** PARA UTILIZAR O JSON */
  loadPropertyJson(id: number): void {
    this.loading = true;
    this.propertyService.getPropertyById(id)
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: (property) => {
          this.form.patchValue({
            name: property.name,
            address: property.address,
            description: property.description,
            managers: property.managers?.map(m => m.managerId) || [],
            agents: property.agents || [],
            status: property.status ?? true
          });

          this.statusControl.setValue(property.status === PropertyStatus.ACTIVE ? true : false);

          if (property.managers?.length) {
            this.loadAgentsForManagers(property.managers.map(m => m.managerId));
          }
        },
        error: () => this.showError('Falha ao carregar empreendimento')
      });
  }

  updateAgentsSelection(): void {
    const selectedAgents = this.form.get('agents')?.value || [];
    if (!selectedAgents.length || !this.agents.length) return;

    // Mantém apenas corretores que ainda estão disponíveis
    const updatedSelection = selectedAgents.filter((selected: User) =>
      this.agents.some(a => a.id === selected.id)
    );

    this.form.get('agents')?.setValue(updatedSelection);
  }

  // Obtém os corretores para um gestor específico
  private getAgentsForManager(managerId: number): PropertyAgent[] {
    const managerData = this.selectedManagersWithAgents.find(m => m.managerId === managerId);
    return managerData?.agents || [];
  }

  // Atualiza a lista de corretores quando gestores são selecionados/deselecionados
  updateAgentsList(): void {
    const selectedManagerIds = this.form.get('managers')?.value || [];

    // Filtra apenas os gestores selecionados com seus corretores
    this.selectedManagersWithAgents = this.managers
      .filter(manager => selectedManagerIds.includes(manager.managerId))
      .map(manager => ({
        managerId: manager.managerId as number,
        manager: manager,
        agents: (manager as any).agents ?? []
      }));

    // Atualiza a lista de agentes selecionados (todos os corretores dos gestores selecionados)
    const selectedAgentIds = this.selectedManagersWithAgents
      .flatMap(m => m.agents.map(a => a.agentId));

    this.form.get('agents')?.setValue(selectedAgentIds);
  }

  async toggleManagerSelection(manager: User): Promise<void> {
    // Verifica se o gestor está ativo antes de processar
    if (!manager.isActive) {
      this.showNotificationMessage('warn', 'Gestor Inativo', 'Este gestor está desabilitado e não pode ser selecionado');
      return;
    }

    const managersControl = this.form.get('managers');
    const agentsControl = this.form.get('agents');
    const currentManagers = managersControl?.value || [];
    const currentAgents = agentsControl?.value || [];

    //console.log('GERENTE SELECIONADO: ', manager);

    if (this.isManagerSelected(manager.id)) {
      const updatedManagers = currentManagers.filter((id: number) => id !== manager.id);
      const relation = this.managerAgentRelations.find(r => r.managerId === manager.id);
      const agentIdsToRemove = relation?.agentIds || [];
      const updatedAgents: number[] = currentAgents.filter((id: number) => !agentIdsToRemove.includes(id));

      managersControl?.setValue(updatedManagers);
      agentsControl?.setValue(updatedAgents);

      this.selectedManagersWithAgents = this.selectedManagersWithAgents.filter(
        m => m.managerId !== manager.id
      );

      //console.log('selectedManagersWithAgents: ', this.selectedManagersWithAgents);
      await this.updateManagerAgentsInBackend({
        propertyId: this.propertyId!,
        managerId: manager.id,
        agentIds: []
      });
    } else {
      managersControl?.setValue([...currentManagers, manager.id]);
      await this.loadAgentsForManager(manager.id);
    }
  }

  isManagerSelected(managerId: number): boolean {
    return this.form.get('managers')?.value.includes(managerId);
  }

  private async updateManagerAgentsInBackend(dto: PropertyManagerAgentRequestDTO): Promise<void> {
    if (!dto.propertyId) return;

    try {
      await firstValueFrom(this.propertyService.updatePropertyAgents(dto));
    } catch (error) {
      this.showError('Falha ao atualizar vínculos no banco de dados');
      throw error;
    }
  }

  private async loadAgentsForManager(managerId: number): Promise<void> {
    try {
      this.loadingAgents = true;

      const agents = await firstValueFrom(
        this.userService.getAgentsByManagers([managerId])
      );

      console.log('CORRETORES DO GESTOR: ', agents);
      if (!agents) return;

      const agentIds = agents.map(a => a.id);

      const existingRelationIndex = this.managerAgentRelations.findIndex(
        r => r.managerId === managerId
      );
      if (existingRelationIndex >= 0) {
        this.managerAgentRelations[existingRelationIndex].agentIds = agentIds;
      } else {
        this.managerAgentRelations.push({ managerId, agentIds });
      }

      const currentAgents = this.form.get('agents')?.value || [];
      const updatedAgents = [...new Set([...currentAgents, ...agentIds])];
      this.form.get('agents')?.setValue(updatedAgents);

      await this.updateManagerAgentsInBackend({
        propertyId: this.propertyId!,
        managerId,
        agentIds
      });

      const manager = this.allManagers.find(m => m.id === managerId);
      if (manager) {
        const propertyAgents: PropertyAgent[] = agents.map(agent => ({
          agentId: agent.id,
          agent
        }));

        const existingManagerIndex = this.selectedManagersWithAgents.findIndex(
          m => m.managerId === managerId
        );

        if (existingManagerIndex >= 0) {
          this.selectedManagersWithAgents[existingManagerIndex].agents = propertyAgents;
        } else {
          this.selectedManagersWithAgents.push({
            managerId,
            manager,
            agents: propertyAgents
          });
        }
      }
    } catch (error) {
      this.showError('Falha ao carregar corretores do gestor');
    } finally {
      this.loadingAgents = false;
    }
  }

  toggleAgentSelection(agent: User): void {
    const agentsControl = this.form.get('agents');
    const currentAgents = agentsControl?.value || [];

    if (this.isAgentSelected(agent.id)) {
      // Remove agent from all managers
      this.selectedManagersWithAgents.forEach(managerData => {
        managerData.agents = managerData.agents.filter(a => a.agentId !== agent.id);
      });
      agentsControl?.setValue(currentAgents.filter((id: number) => id !== agent.id));
    } else {
      // Add agent to its manager's list
      if (agent.managerId) {
        const managerIndex = this.selectedManagersWithAgents.findIndex(m => m.managerId === agent.managerId);
        if (managerIndex >= 0 && !this.selectedManagersWithAgents[managerIndex].agents.some(a => a.agentId === agent.id)) {
          this.selectedManagersWithAgents[managerIndex].agents.push({
            agentId: agent.id,
            agent
          });
        }
      }
      agentsControl?.setValue([...currentAgents, agent.id]);
    }
  }

  updateSelectedAgents(): void {
    // Mantém apenas os agentes que pertencem aos gestores selecionados
    const selectedManagerIds = this.form.get('managers')?.value || [];
    const currentSelectedAgents = this.form.get('agents')?.value || [];

    const validAgentIds = this.allAgents
      .filter(agent => selectedManagerIds.includes(agent.managerId!))
      .map(agent => agent.id);

    const newSelectedAgents = currentSelectedAgents.filter((id: number) =>
      validAgentIds.includes(id)
    );

    this.form.get('agents')?.setValue(newSelectedAgents);
  }

  // Verifica se um corretor está selecionado (sempre true, pois não pode desmarcar)
  isAgentSelected(agentId: number): boolean {
    const selectedAgents = this.form.get('agents')?.value || [];
    return selectedAgents.includes(agentId);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.markAllAsTouched();
      this.showWarn('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    this.loading = true;
    const propertyData = {
      ...this.form.value,
      status: this.statusControl.value
    };

    const operation = this.isEdit
      ? this.propertyService.updateProperty(this.propertyId!, propertyData)
      : this.propertyService.createProperty(propertyData);

    operation.pipe(finalize(() => this.loading = false))
      .subscribe({
        next: () => {
          this.showSuccess(`Empreendimento ${this.isEdit ? 'atualizado' : 'criado'} com sucesso`);
          this.router.navigate(['/properties']);
        },
        error: () => this.showError(`Falha ao ${this.isEdit ? 'atualizar' : 'criar'} empreendimento`)
      });
  }

  cancel(): void {
    if (this.form.dirty) {
      if (!confirm('Tem certeza que deseja sair? As alterações não serão salvas.')) {
        return;
      }
    }
    this.router.navigate(['/properties']);
  }

  private markAllAsTouched(): void {
    Object.values(this.form.controls).forEach(control => {
      control.markAsTouched();
    });
  }

  get selectedManager(): PropertyManager | null {
    if (!this.property || !this.property.managers.length) return null;
    return this.property.managers[this.selectedManagerIndex];
  }

  showNotificationMessage(type: 'success' | 'error' | 'warn', title: string, message: string): void {
    this.notificationType = type;
    this.notificationTitle = title;
    this.notificationMessage = message;

    switch (type) {
      case 'success':
        this.notificationClass = 'bg-green-50 border border-green-200 text-green-800';
        break;
      case 'error':
        this.notificationClass = 'bg-red-50 border border-red-200 text-red-800';
        break;
      case 'warn':
        this.notificationClass = 'bg-yellow-50 border border-yellow-200 text-yellow-800';
        break;
    }

    this.showNotification = true;
    setTimeout(() => this.dismissNotification(), 5000);
  }

  dismissNotification(): void {
    this.showNotification = false;
  }

  showSuccess(message: string): void {
    this.showNotificationMessage('success', 'Sucesso', message);
  }

  showError(message: string): void {
    this.showNotificationMessage('error', 'Erro', message);
  }

  showWarn(message: string): void {
    this.showNotificationMessage('warn', 'Atenção', message);
  }

  /* private showSuccess(message: string): void {
    this.messageService.add({
      severity: 'success',
      summary: 'Sucesso',
      detail: message,
      life: 5000
    });
  }

  private showError(message: string): void {
    this.messageService.add({
      severity: 'error',
      summary: 'Erro',
      detail: message,
      life: 5000
    });
  }

  private showWarn(message: string): void {
    this.messageService.add({
      severity: 'warn',
      summary: 'Atenção',
      detail: message,
      life: 5000
    });
  } */
}