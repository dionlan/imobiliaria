import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Property } from '../../../models/property.model';
import { PropertyService } from '../../../services/property.service';
import { UserService } from '../../../services/user.service';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { CommonModule } from '@angular/common';
import { MultiSelectModule } from 'primeng/multiselect';
import { User, UserRole } from '../../../models/user.model';

@Component({
  selector: 'app-property-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    InputTextModule,
    DropdownModule,
    ButtonModule,
    ToastModule,
    RouterLink,
    MultiSelectModule
  ],
  templateUrl: './property-form.component.html',
  styleUrls: ['./property-form.component.scss']
})
export class PropertyFormComponent implements OnInit {
  form: FormGroup;
  isEdit = false;
  propertyId: string | null = null;
  managers: User[] = [];
  agents: User[] = [];

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
      agents: [[]]
    });
  }

  ngOnInit(): void {
    this.loadManagers();
    this.propertyId = this.route.snapshot.paramMap.get('id');
    if (this.propertyId) {
      this.isEdit = true;
      this.loadProperty(Number(this.propertyId));
    }
  }

  loadManagers(): void {
    this.userService.getUsersByRole(UserRole.MANAGER).subscribe(managers => {
      this.managers = managers;
    });
  }

  loadAgentsForManagers(managerIds: number[]): void {
    this.userService.getUsersByRole(UserRole.AGENT).subscribe(agents => {
      this.agents = agents.filter(agent =>
        managerIds.some(managerId => agent.managers?.includes(managerId))
      );
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
        this.loadAgentsForManagers(property.managers);
      }
    });
  }

  onManagersChange(managerIds: number[]): void {
    this.loadAgentsForManagers(managerIds);
    this.form.get('agents')?.setValue([]);
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    const propertyData = this.form.value;
    const operation = this.isEdit
      ? this.propertyService.updateProperty(Number(this.propertyId!), propertyData)
      : this.propertyService.createProperty(propertyData);

    operation.subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Sucesso',
          detail: `Empreendimento ${this.isEdit ? 'atualizado' : 'criado'} com sucesso`
        });
        this.router.navigate(['/properties']);
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: `Falha ao ${this.isEdit ? 'atualizar' : 'criar'} empreendimento`
        });
      }
    });
  }
}