import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { finalize } from 'rxjs';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { AdvancedFilterComponent } from '../../../components/shared/advanced-filter/advanced-filter.component';
import { Campaign, CampaignStatus } from '../../../models/campaing.model';
import { CampaignService } from '../../../services/campaign.service';
import { AuthService } from '../../../services/auth.service';
import { PropertySelectorComponent } from './property-selector/property-selector.component';
import { Property } from '../../../models/property.model';
import { PropertyService } from '../../../services/property.service';
import { FilterCriteria } from '../../../components/shared/advanced-filter/model/filter-criteria';

@Component({
    selector: 'app-campaign-list',
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        ToastModule,
        AdvancedFilterComponent,
        PropertySelectorComponent
    ],
    templateUrl: './campaign-list.component.html',
    providers: [ConfirmationService, MessageService]
})
export class CampaignListComponent implements OnInit {
    campaigns: Campaign[] = [];
    filteredCampaigns: Campaign[] = [];
    properties: Property[] = [];
    expandedDescriptions: Set<number> = new Set();
    loading = true;
    propertiesLoading = true;
    selectedCampaign: Campaign | null = null;
    sortField = 'name';
    sortOrder = 1;

    pagination = {
        page: 0,
        pageSize: 10,
        totalRecords: 0,
        totalPages: 0
    };

    constructor(
        private campaignService: CampaignService,
        public authService: AuthService,
        private confirmationService: ConfirmationService,
        private propertyService: PropertyService,
        private messageService: MessageService,
        private router: Router
    ) { }

    ngOnInit(): void {
        this.loadCampaigns();
        this.loadProperties();
    }

    loadCampaigns(): void {
        this.loading = true;
        this.campaignService.getAllCampaignsPaginada(this.pagination.page, this.pagination.pageSize)
            .pipe(finalize(() => this.loading = false))
            .subscribe({
                next: (response) => {
                    this.campaigns = response.content;
                    this.filteredCampaigns = [...response.content];
                    console.log('CAMPANHAS: ', this.campaigns)
                    this.pagination.totalRecords = response.totalElements;
                    this.pagination.totalPages = response.totalPages;
                    // Mapeia os empreendimentos após carregar ambos (campanhas e propriedades)
                    if (this.properties.length > 0) {
                        this.mapPropertiesToCampaigns();
                    }
                    this.sort(this.sortField);
                },
                error: () => this.showErrorMessage('Falha ao carregar campanhas')
            });
    }

    loadProperties(): void {
        this.propertiesLoading = true;
        this.propertyService.getProperties().pipe(
            finalize(() => this.propertiesLoading = false)
        ).subscribe({
            next: (properties) => {
                this.properties = properties
                console.log('PROPERTIES CAMPAING: ', this.properties);
                if (this.campaigns.length > 0) {
                    this.mapPropertiesToCampaigns();
                }
            },
            error: () => this.showErrorMessage('Falha ao carregar empreendimentos')
        });
    }

    getPropertyName(propertyId: number): string {
        const property = this.properties.find(p => p.id === propertyId);
        return property ? property.name : 'Empreendimento não encontrado';
    }

    applyFilter(filter: FilterCriteria): void {
        if (!filter || Object.keys(filter).every(key => !filter[key as keyof FilterCriteria])) {
            this.filteredCampaigns = [...this.campaigns];
            this.pagination.totalRecords = this.filteredCampaigns.length;
            this.pagination.page = 1;
            return;
        }

        this.filteredCampaigns = this.campaigns.filter(campaign => {
            // Filtro por texto
            const matchesSearch = !filter.searchTerm ||
                [campaign.description, campaign.code, campaign.property?.name]
                    .some(field => field?.toLowerCase().includes(filter.searchTerm!.toLowerCase()));

            // Filtro por status
            const matchesStatus = !filter.status ||
                campaign.status === filter.status;

            // Filtro por data
            let matchesDate = true;
            if (filter.startDate || filter.endDate) {
                const campaignDate = this.parseDate(
                    typeof campaign.createdAt === 'string'
                        ? campaign.createdAt
                        : campaign.createdAt?.toISOString?.() ?? ''
                );

                if (filter.startDate && campaignDate < filter.startDate) {
                    matchesDate = false;
                }
                if (filter.endDate) {
                    const endDate = new Date(filter.endDate);
                    endDate.setDate(endDate.getDate() + 1); // Inclui todo o dia final
                    if (campaignDate >= endDate) {
                        matchesDate = false;
                    }
                }
            }

            return matchesSearch && matchesStatus && matchesDate;
        });

        this.pagination.totalRecords = this.filteredCampaigns.length;
        this.pagination.page = 1;
    }

    private parseDate(dateString: string): Date {
        if (!dateString) return new Date(0);

        // Converte de "dd/MM/yyyy HH:mm:ss" para Date
        const [datePart, timePart] = dateString.split(' ');
        const [day, month, year] = datePart.split('/').map(Number);

        return new Date(year, month - 1, day);
    }

    sort(field: string): void {
        if (this.sortField === field) {
            this.sortOrder *= -1;
        } else {
            this.sortField = field;
            this.sortOrder = 1;
        }

        this.filteredCampaigns.sort((a, b) => {
            const valueA = a[field as keyof Campaign];
            const valueB = b[field as keyof Campaign];

            if (valueA === undefined && valueB === undefined) return 0;
            if (valueA === undefined) return 1 * this.sortOrder;
            if (valueB === undefined) return -1 * this.sortOrder;

            if (valueA < valueB) return -1 * this.sortOrder;
            if (valueA > valueB) return 1 * this.sortOrder;
            return 0;
        });
    }

    hasValidProperty(campaign: Campaign): boolean {
        if (!campaign.property) return false;
        return !!this.properties.find(p => p.id === campaign.property?.propertyId);
    }

    private mapPropertiesToCampaigns(): void {
        this.filteredCampaigns = this.campaigns.map(campaign => {
            const property = campaign.property?.propertyId
                ? this.properties.find(p => p.id === campaign.property?.propertyId)
                : null;

            return {
                ...campaign,
                property: property ? {
                    propertyId: property.id,
                    name: property.name
                } : campaign.property // Mantém o original se existir
            };
        });
    }

    getStatusBadgeClass(status: CampaignStatus): string {
        switch (status) {
            case CampaignStatus.ACTIVE: return 'bg-green-100 text-green-800';
            case CampaignStatus.INACTIVE: return 'bg-red-100 text-red-800';
            case CampaignStatus.SCHEDULED: return 'bg-blue-100 text-blue-800';
            case CampaignStatus.EXPIRED: return 'bg-yellow-100 text-yellow-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    }

    getStatusDisplayName(status: CampaignStatus): string {
        return {
            [CampaignStatus.ACTIVE]: 'Ativa',
            [CampaignStatus.INACTIVE]: 'Inativa',
            [CampaignStatus.SCHEDULED]: 'Agendada',
            [CampaignStatus.EXPIRED]: 'Expirada'
        }[status] || status;
    }

    confirmDelete(campaign: Campaign): void {
        this.confirmationService.confirm({
            message: `Deseja realmente excluir a campanha "${campaign.name}"?`,
            header: 'Confirmar Exclusão',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Sim',
            rejectLabel: 'Não',
            accept: () => this.deleteCampaign(campaign.id)
        });
    }

    deleteCampaign(id: number): void {
        this.loading = true;
        this.campaignService.deleteCampaign(id)
            .pipe(finalize(() => this.loading = false))
            .subscribe({
                next: () => {
                    this.showSuccessMessage('Campanha excluída com sucesso');
                    this.loadCampaigns();
                },
                error: () => this.showErrorMessage('Falha ao excluir campanha')
            });
    }

    associateWithProperty(campaignId: number, propertyId: number): void {
        console.log('ID DA CAMPANHA: ', campaignId, 'ID PROPERTY: ', propertyId);
        this.loading = true;
        this.campaignService.associateWithProperty(campaignId, propertyId)
            .pipe(finalize(() => this.loading = false))
            .subscribe({
                next: () => {
                    this.showSuccessMessage('Campanha associada com sucesso');
                    this.loadCampaigns();
                },
                error: () => this.showErrorMessage('Falha ao associar campanha')
            });
    }

    removeFromProperty(campaignId: number, propertyId: number): void {
        this.loading = true;
        this.campaignService.removeFromProperty(campaignId, propertyId)
            .pipe(finalize(() => this.loading = false))
            .subscribe({
                next: () => {
                    this.showSuccessMessage('Campanha desassociada com sucesso');
                    this.loadCampaigns();
                },
                error: () => this.showErrorMessage('Falha ao desassociar campanha')
            });
    }

    changePage(page: number): void {
        this.pagination.page = page - 1; // Ajuste para Spring (0-based)
        this.loadCampaigns();
    }

    get pages(): number[] {
        return Array.from({ length: this.pagination.totalPages }, (_, i) => i + 1);
    }

    getMin(a: number, b: number): number {
        return Math.min(a, b);
    }

    editCampaign(campaignId: number): void {
        this.router.navigate(['/campaigns', campaignId, 'edit']);
    }

    navigateToCreate(): void {
        this.router.navigate(['/campaigns/new']);
    }

    // Métodos adicionais para manipulação da descrição
    isDescriptionExpanded(campaignId: number): boolean {
        return this.expandedDescriptions.has(campaignId);
    }

    toggleDescription(campaignId: number): void {
        if (this.expandedDescriptions.has(campaignId)) {
            this.expandedDescriptions.delete(campaignId);
        } else {
            this.expandedDescriptions.add(campaignId);
        }
    }

    // Método para lidar com código nulo
    getCodePrefix(code: string | null | undefined): string {
        if (!code) return '--';
        return code.length >= 2 ? code.substring(0, 2) : code;
    }

    // Método para verificar se deve mostrar o botão de expandir
    shouldShowExpandButton(description: string | null | undefined): boolean {
        return !!description && description.length > 100;
    }

    // Substitua o método getStatusBadgeClass por este:
    getStatusColorClass(status: CampaignStatus): string {
        switch (status) {
            case CampaignStatus.ACTIVE: return 'bg-green-400';
            case CampaignStatus.INACTIVE: return 'bg-red-400';
            case CampaignStatus.SCHEDULED: return 'bg-blue-400';
            case CampaignStatus.EXPIRED: return 'bg-yellow-400';
            default: return 'bg-gray-400';
        }
    }

    // Métodos para controle da paginação
    getVisiblePages(): number[] {
        const current = this.pagination.page + 1;
        const total = this.pagination.totalPages;
        const range = 1; // Quantidade de páginas ao redor da atual

        let start = Math.max(2, current - range);
        let end = Math.min(total - 1, current + range);

        // Ajusta se estiver no início
        if (current - range <= 2) {
            end = Math.min(4, total - 1);
        }

        // Ajusta se estiver no final
        if (current + range >= total - 1) {
            start = Math.max(total - 3, 2);
        }

        const pages = [];
        for (let i = start; i <= end; i++) {
            pages.push(i);
        }

        return pages;
    }

    showFirstPage(): boolean {
        return this.pagination.totalPages > 0;
    }

    showLastPage(): boolean {
        return this.pagination.totalPages > 1;
    }

    showFirstEllipsis(): boolean {
        return this.pagination.page + 1 > 3 && this.pagination.totalPages > 5;
    }

    showLastEllipsis(): boolean {
        return this.pagination.page + 1 < this.pagination.totalPages - 2 && this.pagination.totalPages > 5;
    }

    private showSuccessMessage(message: string): void {
        this.messageService.add({
            severity: 'success',
            summary: 'Sucesso',
            detail: message,
            life: 5000
        });
    }

    private showErrorMessage(message: string): void {
        this.messageService.add({
            severity: 'error',
            summary: 'Erro',
            detail: message,
            life: 5000
        });
    }
}