import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { UserService } from '../../../services/user.service';
import { ActivatedRoute, Router } from '@angular/router';
import { User, UserRole } from '../../../models/user.model';
import { CommonModule } from '@angular/common';
import { Property } from '../../../models/property.model';
import { PropertyService } from '../../../services/property.service';

@Component({
    selector: 'app-user-form',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, FormsModule],
    templateUrl: './user-form.component.html',
    styleUrls: ['./user-form.component.scss']
})
export class UserFormComponent implements OnInit {
    form: FormGroup;
    isEdit = false;
    userId: number | null = null;
    loading = false;
    searchTerm = '';
    agentSearchControl = new FormControl('');
    editingUserRole: UserRole = UserRole.MANAGER;
    currentUser: User | null = null;
    // Expor o enum para o template
    UserRole = UserRole;

    // Lista de corretores
    allAgents: User[] = [];
    filteredAgents: User[] = [];
    linkedAgents: User[] = [];
    availableAgents: User[] = [];

    filteredAvailableAgents: User[] = [];
    agentSearchTerm = '';
    linkedProperties: Property[] = [];
    allProperties: Property[] = [];

    // Dados para corretores
    availableManagers: User[] = [];
    agentProperties: Property[] = [];
    managerSearchTerm = '';
    filteredAvailableManagers: User[] = [];

    constructor(
        private fb: FormBuilder,
        private route: ActivatedRoute,
        private router: Router,
        private userService: UserService,
        private propertyService: PropertyService
    ) {
        this.form = this.fb.group({
            name: ['', Validators.required],
            email: ['', [Validators.required, Validators.email]],
            phone: [''],
            role: [{ value: 'GESTOR', disabled: false }, Validators.required],
            managerId: [''],
            searchTerm: ['']
        });
    }

    ngOnInit(): void {
        this.currentUser = this.userService.getCurrentUser();

        const idParam = this.route.snapshot.paramMap.get('id');
        this.userId = idParam ? +idParam : null;

        if (this.userId) {
            this.isEdit = true;
            this.loadUser(this.userId);
        }

        this.loadAllAgents();
        this.loadAllManagers();
        this.loadAllProperties();

        // Observar mudanças no campo de role
        this.form.get('role')?.valueChanges.subscribe(role => {
            this.editingUserRole = role;
            console.log('PERFIL DO USUÁRIO EDITADO: ', this.editingUserRole);
            this.onRoleChange();
        });

        // Configurar permissões baseadas no usuário logado
        this.setupPermissions();
    }

    setupPermissions(): void {
        if (!this.currentUser) return;

        // Se não for admin, desabilita edição de perfil
        if (this.currentUser.role !== UserRole.ADMIN) {
            this.form.get('role')?.disable();
        }

        // Se for gestor ou corretor, só pode visualizar
        if (this.currentUser.role !== UserRole.ADMIN) {
            this.form.disable();
        }
    }

    filterAgentsNovo(searchTerm: string): void {
        if (!searchTerm) {
            this.filteredAvailableAgents = [...this.availableAgents];
            return;
        }

        const term = searchTerm.toLowerCase();
        this.filteredAvailableAgents = this.availableAgents.filter(agent =>
            agent.name.toLowerCase().includes(term) ||
            agent.email.toLowerCase().includes(term)
        );
    }

    showPropertyModal = false;
    availableProperties: Property[] = [];

    openPropertyLinkModal(): void {
        this.availableProperties = this.allProperties.filter(
            p => !this.linkedProperties.some(lp => lp.id === p.id)
        );
        this.showPropertyModal = true;
    }

    selectProperty(property: Property): void {
        this.linkProperty(property.id);
        this.showPropertyModal = false;
    }

    /* loadUser(id: number): void {
        this.loading = true;
        this.userService.getUserById(id).subscribe({
            next: (user) => {
                this.form.patchValue({
                    name: user!.name,
                    email: user!.email,
                    role: user!.role
                });

                // Carrega corretores vinculados
                if (user!.managedAgents && user!.managedAgents.length > 0) {
                    this.linkedAgents = this.allAgents.filter(a =>
                        user!.managedAgents!.includes(a.id)
                    );
                    this.updateAvailableAgents();
                }

                this.loading = false;
            },
            error: () => {
                this.loading = false;
                // Tratar erro
            }
        });
    } */

    loadUser(id: number): void {
        this.loading = true;
        this.userService.getUserById(id).subscribe({
            next: (user) => {
                this.editingUserRole = user?.role as UserRole;
                this.form.patchValue({
                    name: user!.name,
                    email: user!.email,
                    phone: user!.phone,
                    role: user!.role,
                    managerId: user!.managerId
                });

                // Carrega dados específicos do perfil
                if (user!.role === 'GESTOR') {
                    if (user!.managedAgents && user!.managedAgents.length > 0) {
                        this.linkedAgents = this.allAgents.filter(a =>
                            user!.managedAgents!.includes(a.id)
                        );
                        this.filterAvailableAgents();
                    }

                    if (user!.properties) {
                        this.linkedProperties = user!.properties;
                    }
                } else if (user!.role === 'CORRETOR') {
                    if (user!.properties) {
                        this.agentProperties = user!.properties;
                    }
                }

                this.loading = false;
            },
            error: () => {
                this.loading = false;
                // Tratar erro
            }
        });
    }

    /*loadAllAgents(): void {
        this.loading = true;
        this.userService.getAllAgents().subscribe({
            next: (agents) => {
                this.allAgents = agents;
                this.filteredAgents = [...agents];
                this.updateAvailableAgents();
                this.loading = false;
            },
            error: () => {
                this.loading = false;
                // Tratar erro
            }
        });
    }

    filterAgents(): void {
        if (!this.searchTerm) {
            this.filteredAgents = [...this.allAgents];
        } else {
            const term = this.searchTerm.toLowerCase();
            this.filteredAgents = this.allAgents.filter(a =>
                a.name.toLowerCase().includes(term) ||
                a.email.toLowerCase().includes(term)
            );
        }
        this.updateAvailableAgents();
    } */

    loadAllAgents(): void {
        this.userService.getAllAgents().subscribe(agents => {
            this.allAgents = agents;
            this.filterAvailableAgents();
        });
    }

    loadAllManagers(): void {
        this.userService.getAllManagers().subscribe(managers => {
            this.availableManagers = managers;
        });
    }

    loadAllProperties(): void {
        this.propertyService.getPropertiesNovo().subscribe(properties => {
            this.allProperties = properties;
        });
    }

    updateAvailableAgents(): void {
        this.availableAgents = this.filteredAgents.filter(a =>
            !this.linkedAgents.some(la => la.id === a.id)
        );
    }

    linkAgent(agentId: number): void {
        const agent = this.allAgents.find(a => a.id === agentId);
        if (agent) {
            this.linkedAgents.push(agent);
            this.updateAvailableAgents();
        }
    }

    unlinkAgent(agentId: number): void {
        this.linkedAgents = this.linkedAgents.filter(a => a.id !== agentId);
        this.updateAvailableAgents();
    }

    linkProperty(propertyId: number): void {
        const property = this.allProperties.find(p => p.id === propertyId);
        if (property && !this.linkedProperties.some(p => p.id === propertyId)) {
            this.linkedProperties = [...this.linkedProperties, property];
        }
    }

    unlinkProperty(propertyId: number): void {
        this.linkedProperties = this.linkedProperties.filter(p => p.id !== propertyId);
    }

    onSubmit(): void {
        if (this.form.invalid) return;

        this.loading = true;
        const userData = {
            ...this.form.value,
            managedAgentIds: this.linkedAgents.map(a => a.id),
            propertyIds: this.linkedProperties.map(p => p.id)
        };

        const operation = this.isEdit
            ? this.userService.updateUser(this.userId!, userData)
            : this.userService.createUser(userData);

        operation.subscribe({
            next: () => {
                this.router.navigate(['/users']);
            },
            error: () => {
                this.loading = false;
                // Tratar erro
            }
        });
    }

    cancel(): void {
        if (this.form.dirty) {
            if (!confirm('Tem certeza que deseja sair? As alterações não salvas serão perdidas.')) {
                return;
            }
        }
        this.router.navigate(['/users']);
    }

    filterAgents(): void {
        const searchTerm = this.form.get('searchTerm')?.value.toLowerCase() || '';
        this.filterAvailableAgents();
    }

    filterAvailableAgents(): void {
        const searchTerm = this.form.get('searchTerm')?.value.toLowerCase() || '';

        this.filteredAvailableAgents = this.allAgents.filter(agent =>
            !this.linkedAgents.some(a => a.id === agent.id) &&
            (agent.name.toLowerCase().includes(searchTerm) ||
                agent.email.toLowerCase().includes(searchTerm)
            ));
    }

    filterManagers(): void {
        if (!this.managerSearchTerm) {
            this.filteredAvailableManagers = [...this.availableManagers];
            return;
        }

        const term = this.managerSearchTerm.toLowerCase();
        this.filteredAvailableManagers = this.availableManagers.filter(manager =>
            manager.name.toLowerCase().includes(term) ||
            manager.email.toLowerCase().includes(term)
        );
    }

    addAgent(agentId: number): void {
        const agent = this.allAgents.find(a => a.id === agentId);
        if (agent) {
            this.linkedAgents.push(agent);
            this.filterAvailableAgents();
        }
    }

    onRoleChange(): void {
        const role = this.form.get('role')?.value;

        // Resetar dados específicos quando o perfil muda
        if (role !== 'GESTOR') {
            this.linkedAgents = [];
        }
        if (role !== 'CORRETOR') {
            this.form.get('managerId')?.reset();
        }

        this.filterAvailableAgents();
    }

    removeAgent(agentId: number): void {
        this.linkedAgents = this.linkedAgents.filter(a => a.id !== agentId);
        this.filterAvailableAgents();
    }

    // Verifica se o usuário atual pode editar
    canEdit(): boolean {
        return this.currentUser?.role === UserRole.ADMIN;
    }

    // Métodos de verificação de perfil
    isManager(): boolean {
        return this.editingUserRole === UserRole.MANAGER;
    }

    isAgent(): boolean {
        return this.editingUserRole === UserRole.AGENT;
    }

    isAdmin(): boolean {
        return this.editingUserRole === UserRole.ADMIN;
    }

    // Método para verificar se pode editar propriedades
    canLinkProperties(): boolean {
        return this.canEdit() && (this.isManager() || this.isAgent());
    }

    // Método para verificar se pode editar corretores
    canLinkAgents(): boolean {
        return this.canEdit() && this.isManager();
    }

    canLinkManagers(): boolean {
        return this.canEdit() && this.isAgent();
    }

    isViewMode(): boolean {
        return !this.canEdit();
    }

    // Obter classe CSS para o cabeçalho
    getHeaderClass(): string {
        switch (this.editingUserRole) {
            case UserRole.MANAGER:
                return 'bg-gradient-to-r from-indigo-700 to-blue-600';
            case UserRole.AGENT:
                return 'bg-gradient-to-r from-green-600 to-teal-500';
            case UserRole.ADMIN:
            default:
                return 'bg-gradient-to-r from-purple-600 to-pink-500';
        }
    }

    // Método para obter o nome do perfil
    getUserRoleName(): string {
        switch (this.editingUserRole) {
            case UserRole.MANAGER: return 'Gestor';
            case UserRole.AGENT: return 'Corretor';
            case UserRole.ADMIN: return 'Administrador';
            default: return 'Usuário';
        }
    }

    getDisplayRole(): string {
        const role = this.form.get('role')?.value as UserRole || UserRole.MANAGER;
        switch (role) {
            case UserRole.MANAGER: return 'Gestor';
            case UserRole.AGENT: return 'Corretor';
            case UserRole.ADMIN: return 'Administrador';
            default: return 'Gestor'; // Fallback
        }
    }

    // Método para obter o gestor vinculado
    getLinkedManager(): User | null {
        const managerId = this.form.get('managerId')?.value;
        if (!managerId) return null;

        return this.availableManagers.find(m => m.id === managerId) || null;
    }

    // Método para obter nome do gestor
    getManagerName(managerId: number): string {
        const manager = this.getLinkedManager();
        return manager?.name || 'Gestor não definido';
    }

    // Método para verificar se pode alterar gestor
    canChangeManager(): boolean {
        return this.canEdit() && this.isAgent();
    }

    // Método para obter email do gestor
    getManagerEmail(): string {
        const manager = this.getLinkedManager();
        return manager?.email || '';
    }

    // Método para verificar se pode editar propriedades
    canEditProperties(): boolean {
        return this.canEdit() || this.isManager();
    }

    // Método para verificar se pode editar gestor vinculado
    canEditManager(): boolean {
        return this.canEdit() && this.isAgent();
    }

    // Método para verificar se pode editar corretores
    canEditAgents(): boolean {
        return this.canEdit() && this.isManager();
    }

    // Métodos auxiliares para controle de exibição
    shouldShowPropertiesSection(): boolean {
        // Mostrar para todos os perfis
        return true;
    }

    shouldShowManagerSection(): boolean {
        // Mostrar para corretores e admin/gestor (quando editando corretor)
        return this.isAgent() ||
            (this.isAdmin() && this.editingUserRole === UserRole.AGENT) ||
            (this.isManager() && this.editingUserRole === UserRole.AGENT);
    }

    shouldShowAgentsSection(): boolean {
        // Mostrar apenas para gestores e admin (quando editando gestor)
        return this.isManager() ||
            (this.isAdmin() && this.editingUserRole === UserRole.MANAGER);
    }

    shouldShowManagersSection(): boolean {
        // Mostrar apenas para corretores quando editado por admin
        return this.isAgent() && this.canEdit();
    }

    // Método para verificar se é visualização (não edição)
    isViewOnly(): boolean {
        return this.isEdit && !this.canEdit();
    }
}