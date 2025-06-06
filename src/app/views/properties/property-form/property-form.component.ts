import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { PropertyService } from '../../../services/property.service';
import { UserService } from '../../../services/user.service';
import { ActivatedRoute, Router } from '@angular/router';
import { User, UserRole } from '../../../models/user.model';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { finalize } from 'rxjs';
import { PropertyStatus } from '../../../models/property.model';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-property-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, ToastModule],
  templateUrl: './property-form.component.html',
  styleUrls: ['./property-form.component.scss'],
  providers: [MessageService]
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

  // Corretores
  agents: User[] = [];
  filteredAgents: User[] = [];
  agentSearchTerm = '';

  // Notificações
  showNotification = false;
  notificationType: 'success' | 'error' | 'warn' = 'success';
  notificationTitle = '';
  notificationMessage = '';
  notificationClass = '';

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
    this.loadManagers();
    const idParam = this.route.snapshot.paramMap.get('id');
    this.propertyId = idParam !== null ? Number(idParam) : null;

    if (this.propertyId) {
      this.isEdit = true;
      this.loadProperty(this.propertyId);
    }

    // Sincroniza o status control com o form
    this.statusControl.valueChanges.subscribe(value => {
      this.form.get('status')?.setValue(value);
    });
  }
  
  loadManagers(): void {
    this.userService.getUsersByRole(UserRole.MANAGER).subscribe({
      next: (managers) => {
        this.managers = managers;
        this.filteredManagers = [...managers];
      },
      error: () => this.showError('Falha ao carregar gestores')
    });
  }

  filterManagers(): void {
    if (!this.managerSearchTerm) {
      this.filteredManagers = [...this.managers];
      return;
    }

    const term = this.managerSearchTerm.toLowerCase();
    this.filteredManagers = this.managers.filter(manager =>
      manager.name.toLowerCase().includes(term) ||
      manager.email.toLowerCase().includes(term)
    );
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

  loadProperty(id: number): void {
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

  isManagerSelected(managerId: number): boolean {
    return this.form.get('managers')?.value.includes(managerId);
  }

  toggleManagerSelection(manager: User): void {
    const managersControl = this.form.get('managers');
    const currentManagers = managersControl?.value || [];

    if (this.isManagerSelected(manager.id)) {
      // Remove o gestor
      managersControl?.setValue(currentManagers.filter((id: number) => id !== manager.id));
    } else {
      // Adiciona o gestor
      managersControl?.setValue([...currentManagers, manager.id]);
    }

    // Recarrega corretores quando gestores mudam
    if (managersControl?.value.length > 0) {
      this.loadAgentsForManagers(managersControl!.value);
    } else {
      this.agents = [];
      this.form.get('agents')?.setValue([]);
    }
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

  isAgentSelected(agentId: number): boolean {
    const selectedAgents = this.form.get('agents')?.value || [];
    return selectedAgents.some((a: User) => a.id === agentId);
  }

  toggleAgentSelection(agent: User): void {
    const agentsControl = this.form.get('agents');
    const currentAgents = agentsControl?.value || [];

    if (this.isAgentSelected(agent.id)) {
      // Remove o corretor
      agentsControl?.setValue(currentAgents.filter((a: User) => a.id !== agent.id));
    } else {
      // Adiciona o corretor
      agentsControl?.setValue([...currentAgents, agent]);
    }
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