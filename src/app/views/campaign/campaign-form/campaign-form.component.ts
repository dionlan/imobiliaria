import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UserService } from '../../../services/user.service';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { User, UserRole } from '../../../models/user.model';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { DropdownModule } from 'primeng/dropdown';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { RouterModule } from '@angular/router';

@Component({
    selector: 'app-user-form',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        InputTextModule,
        MultiSelectModule,
        InputGroupModule,
        InputGroupAddonModule,
        DropdownModule,
        ButtonModule,
        ToastModule,
        RouterModule
    ],
    templateUrl: './user-form.component.html',
    styleUrls: ['./user-form.component.scss']
})
export class UserFormComponent implements OnInit {
    form: FormGroup;
    isEdit = false;
    userId: number | null = null;
    roles = [
        { value: UserRole.ADMIN, label: 'Administrador' },
        { value: UserRole.MANAGER, label: 'Gestor' },
        { value: UserRole.AGENT, label: 'Corretor' }
    ];
    managers: any[] = []; // Adicione esta linha

    constructor(
        private fb: FormBuilder,
        private userService: UserService,
        private route: ActivatedRoute,
        private router: Router,
        private messageService: MessageService
    ) {
        this.form = this.fb.group({
            name: ['', Validators.required],
            email: ['', [Validators.required, Validators.email]],
            role: [UserRole.AGENT, Validators.required],
            managers: [[]]
        });
    }

    ngOnInit(): void {
        const idParam = this.route.snapshot.paramMap.get('id');
        this.userId = idParam !== null ? Number(idParam) : null;
        this.loadManagers(); // Adicione esta linha
        if (this.userId) {
            this.isEdit = true;
            this.loadUser(this.userId);
        }
    }

    // Adicione este novo método
    loadManagers(): void {
        this.userService.getUsersByRole(UserRole.MANAGER).subscribe(managers => {
            this.managers = managers.map(manager => ({
                id: manager.id,
                name: manager.name
            }));
        });
    }

    loadUser(id: number): void {
        this.userService.getUserById(id).subscribe(user => {
            if (user) {
                this.form.patchValue({
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    managers: user.managers || []
                });
            }
        });
    }

    onSubmit(): void {
        if (this.form.invalid) return;

        const userData = this.form.value;
        const operation = this.isEdit
            ? this.userService.updateUser(this.userId!, userData)
            : this.userService.createUser(userData);

        operation.subscribe({
            next: () => {
                this.messageService.add({
                    severity: 'success',
                    summary: 'Sucesso',
                    detail: `Usuário ${this.isEdit ? 'atualizado' : 'criado'} com sucesso`
                });
                this.router.navigate(['/users']);
            },
            error: () => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Erro',
                    detail: `Falha ao ${this.isEdit ? 'atualizar' : 'criar'} usuário`
                });
            }
        });
    }
    /**
   * Navega de volta para a lista de usuários
   */
    navigateBack(): void {
        // Verifica se há alterações não salvas (opcional)
        if (this.form.dirty && !confirm('Tem certeza que deseja sair? As alterações não salvas serão perdidas.')) {
            return;
        }

        // Navega para a lista de usuários
        this.router.navigate(['/users']);
    }
}