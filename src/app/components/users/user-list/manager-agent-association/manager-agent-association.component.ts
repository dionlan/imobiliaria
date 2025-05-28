import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MultiSelectModule } from 'primeng/multiselect';
import { BusinessRulesService } from '../../../services/business-rules.service';
import { UserService } from '../../../services/user.service';
import { User, UserRole } from '../../../models/user.model';

@Component({
    selector: 'app-manager-agent-association',
    standalone: true,
    imports: [CommonModule, FormsModule, MultiSelectModule],
    templateUrl: './manager-agent-association.component.html',
    styleUrls: ['./manager-agent-association.component.scss']
})
export class ManagerAgentAssociationComponent implements OnInit {
    @Input() managerId!: string;
    availableAgents: User[] = [];
    selectedAgents: string[] = [];
    currentAssociations: User[] = [];

    constructor(
        private businessRules: BusinessRulesService,
        private userService: UserService
    ) { }

    ngOnInit(): void {
        this.loadAssociations();
    }

    private loadAssociations(): void {
        this.businessRules.getAvailableAgentsForManager(this.managerId).then(agents => {
            this.availableAgents = agents;
        });

        this.userService.getUsersByRole(UserRole.AGENT).subscribe(agents => {
            this.currentAssociations = agents.filter(agent =>
                agent.managers?.includes(this.managerId)
            );
            this.selectedAgents = this.currentAssociations.map(a => a.id);
        });
    }

    saveAssociations(): void {
        // Implementar lógica de salvamento
    }
}