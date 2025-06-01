import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { PropertyService } from '../../../services/property.service';
import { UserService } from '../../../services/user.service';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { User, UserRole } from '../../../models/user.model';
import { ToastModule } from 'primeng/toast';

@Component({
  selector: 'app-property-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ToastModule
  ],
  templateUrl: './property-form.component.html',
  styleUrls: ['./property-form.component.scss']
})
export class PropertyFormComponent implements OnInit {
  form: FormGroup;
  isEdit = false;
  propertyid: number | null = null;
  managers: User[] = [];
  agents: User[] = [];
  loadingAgents: boolean = false;

  constructor(
    private fb: FormBuilder,
    private propertyService: PropertyService,
    private userService: UserService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      address: ['', Validators.required],
      description: [''],
      managers: [[], Validators.required],
      agents: [[]]
    });
  }

  ngOnInit(): void {
    this.loadManagers();
    const idParam = this.route.snapshot.paramMap.get('id');
    this.propertyid = idParam !== null ? Number(idParam) : null;
    if (this.propertyid) {
      this.isEdit = true;
      this.loadProperty(this.propertyid);
    }
  }

  loadManagers(): void {
    this.userService.getUsersByRole(UserRole.MANAGER).subscribe(managers => {
      this.managers = managers;
    });
  }

  loadAgentsForManagers(managerIds: number[]): void {
    this.userService.getAgentsByManagers(managerIds).subscribe(agents => {
      this.agents = agents;
    });
  }

  loadProperty(id: number): void {
    this.propertyService.getPropertyById(id).subscribe(property => {
      if (property) {
        this.form.patchValue({
          name: property.name,
          address: property.address,
          description: property.description,
          managers: property.managers,
          agents: property.agents || []
        });
        this.loadAgentsForManagers(property.managers.map(m => m.managerId));
      }
    });
  }


  // Adicione esta função para comparar objetos por ID
  compareById(item1: any, item2: any): boolean {
    return item1 && item2 && item1.id === item2.id;
  }

  // Atualize o onManagersChange
  onManagersChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    // Corrigido: pega diretamente o value do FormControl
    const selectedManagerIds = this.form.get('managers')?.value;

    console.log('IDs dos gestores selecionados (corrigido):', selectedManagerIds);

    if (selectedManagerIds?.length > 0) {
      this.loadingAgents = true;
      this.userService.getAgentsByManagers(selectedManagerIds).subscribe({
        next: (agents) => {
          console.log('Corretores encontrados (corrigido):', agents);
          this.agents = agents;
          this.loadingAgents = false;
          this.form.get('agents')?.setValue([]);
        },
        error: (err) => {
          console.error('Erro ao carregar corretores:', err);
          this.loadingAgents = false;
        }
      });
    } else {
      this.agents = [];
      this.form.get('agents')?.setValue([]);
    }
  }
  
  onSubmit(): void {
    if (this.form.invalid) {
      this.markAllAsTouched();
      return;
    }

    const propertyData = this.form.value;
    const operation = this.isEdit
      ? this.propertyService.updateProperty(this.propertyid!, propertyData)
      : this.propertyService.createProperty(propertyData);

    operation.subscribe({
      next: () => {
        this.showSuccessToast();
        this.router.navigate(['/properties']);
      },
      error: () => {
        this.showErrorToast();
      }
    });
  }

  cancel(): void {
    if (this.form.dirty) {
      const confirmLeave = confirm('Tem certeza que deseja sair? As alterações não serão salvas.');
      if (!confirmLeave) return;
    }
    this.router.navigate(['/properties']);
  }

  private markAllAsTouched(): void {
    Object.values(this.form.controls).forEach(control => {
      control.markAsTouched();
    });
  }

  private showSuccessToast(): void {
    // Implementar lógica de toast personalizado se necessário
    console.log(`Empreendimento ${this.isEdit ? 'atualizado' : 'criado'} com sucesso`);
  }

  private showErrorToast(): void {
    // Implementar lógica de toast personalizado se necessário
    console.error(`Falha ao ${this.isEdit ? 'atualizar' : 'criar'} empreendimento`);
  }
}