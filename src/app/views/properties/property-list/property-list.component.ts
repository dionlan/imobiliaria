import { Component, OnInit } from '@angular/core';
import { Property } from '../../../models/property.model';
import { PropertyService } from '../../../services/property.service';
import { AuthService } from '../../../services/auth.service';
import { UserService } from '../../../services/user.service';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AsyncPipe } from '@angular/common';
import { Observable, of } from 'rxjs';
import { catchError, startWith } from 'rxjs/operators';
import { TruncatePipe } from '../../../pipes/truncate.pipe';
import { AdvancedFilterComponent } from '../../../components/shared/advanced-filter/advanced-filter.component';
import { FilterCriteria } from '../../../components/shared/advanced-filter/model/filter-criteria';

@Component({
  selector: 'app-property-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    TruncatePipe,
    AdvancedFilterComponent
  ],
  templateUrl: './property-list.component.html',
  styleUrls: ['./property-list.component.scss']
})

export class PropertyListComponent implements OnInit {
  properties: Property[] = [];
  filteredProperties: Property[] = [];
  loading = true;
  sortField = 'name';
  sortOrder = 1; // 1 para ascendente, -1 para descendente
  managerNamesMap: Map<number, Observable<string>> = new Map();

  constructor(
    private propertyService: PropertyService,
    public authService: AuthService,
    private router: Router
  ) { }

  // Variáveis de paginação
  pagination = {
    page: 0,               // Página atual (0-based index)
    pageSize: 10,          // Itens por página
    totalRecords: 0,       // Total de registros
    totalPages: 0          // Total de páginas
  };

  pages: number[] = [];    // Array de números de páginas para exibir

  ngOnInit(): void {
    this.loadProperties();
  }

  loadProperties(): void {
    this.loading = true;
    this.propertyService.getPropertiesNovo().subscribe({
      next: (properties) => {
        console.log('EMPREENDIMENTOS: ', properties);
        this.properties = this.filterPropertiesByRole(properties);
        this.filteredProperties = [...this.properties];
        this.loading = false;
        this.filteredProperties = [...properties];
        this.pagination.totalRecords = properties.length;
        this.pagination.totalPages = Math.ceil(this.pagination.totalRecords / this.pagination.pageSize);
        this.initializeManagerNamesMap();
        this.updatePages();
      },
      error: () => {
        this.loading = false;
        // Mostrar toast de erro aqui
      }
    });
    /* this.propertyService.getProperties().subscribe({
      next: (properties) => {
        this.properties = this.filterPropertiesByRole(properties);
        this.filteredProperties = [...this.properties];
        this.loading = false;
        this.initializeManagerNamesMap();
      },
      error: () => {
        this.loading = false;
        // Mostrar toast de erro aqui
      }
    }); */
  }

  private initializeManagerNamesMap(): void {
    // Cria um mapa com os IDs e nomes dos gestores já disponíveis
    const managersFromResponse = this.properties
      .flatMap(p => p.managers)
      .map(m => ({ id: m.managerId, name: m.manager ? m.manager.name : 'Gestor não especificado' }));

    // Preenche o managerNamesMap com os dados já disponíveis
    managersFromResponse.forEach(manager => {
      this.managerNamesMap.set(manager.id, of(manager.name));
    });

    console.log('Mapa de gestores inicializado:', this.managerNamesMap);
  }

  applyFilter(filter: FilterCriteria): void {
    if (!filter || Object.keys(filter).every(key => !filter[key as keyof FilterCriteria])) {
      this.filteredProperties = [...this.properties];
      this.pagination.totalRecords = this.filteredProperties.length;
      this.pagination.page = 1;
      return;
    }

    this.filteredProperties = this.properties.filter(property => {
      // Filtro por texto - busca no nome da propriedade e nos nomes dos gestores
      const matchesSearch = !filter.searchTerm ||
        [property.name, ...property.managers.map(manager => manager.manager?.name)]
          .filter((field): field is string => Boolean(field))
          .some(field => field.toLowerCase().includes(filter.searchTerm!.toLowerCase()));

      // Filtro por status
      const matchesStatus = !filter.status ||
        property.status === filter.status;

      // Filtro por data
      let matchesDate = true;
      if (filter.startDate || filter.endDate) {
        const propertyDate = this.parseDate(
          typeof property.createdAt === 'string'
            ? property.createdAt
            : property.createdAt?.toISOString?.() ?? ''
        );

        if (filter.startDate && propertyDate < filter.startDate) {
          matchesDate = false;
        }
        if (filter.endDate) {
          const endDate = new Date(filter.endDate);
          endDate.setDate(endDate.getDate() + 1); // Inclui todo o dia final
          if (propertyDate >= endDate) {
            matchesDate = false;
          }
        }
      }

      return matchesSearch && matchesStatus && matchesDate;
    });

    this.pagination.totalRecords = this.filteredProperties.length;
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

    this.filteredProperties.sort((a, b) => {
      const valueA = a[field as keyof Property];
      const valueB = b[field as keyof Property];

      if (valueA === undefined && valueB === undefined) return 0;
      if (valueA === undefined) return 1 * this.sortOrder;
      if (valueB === undefined) return -1 * this.sortOrder;

      if (valueA < valueB) return -1 * this.sortOrder;
      if (valueA > valueB) return 1 * this.sortOrder;
      return 0;
    });
  }

  private filterPropertiesByRole(properties: Property[]): Property[] {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) return [];

    if (this.authService.isAdmin()) {
      return properties;
    } else if (this.authService.isManager()) {
      return properties.filter(p => p.managers.some(m => m.managerId === currentUser.id));
    } else if (this.authService.isAgent()) {
      return properties.filter(p =>
        p.agents?.includes(currentUser.id) ||
        p.managers.some(m => currentUser.managers?.includes(m.managerId))
      );
    }
    return [];
  }

  getManagerName(id: number): Observable<string> {
    return this.managerNamesMap.get(id) || of('Gestor não especificado');
  }

  /**
 * Navega para a página de edição do empreedimento
 * @param propertyId ID do empreendimento a ser editado
 */
  editProperty(propertyId: number): void {
    this.router.navigate(['/properties', propertyId, 'edit']);
  }

  navigateToCreate(): void {
    this.router.navigate(['/properties/new']);
  }

  // Método para obter nomes dos gestores adicionais
  getAdditionalManagersNames(managers: any[]): string {
    return managers.slice(2).map(m => m.manager!.name).join(', ');
  }

  // Método para mudar de página
  changePage(page: number): void {
    if (page >= 1 && page <= this.pagination.totalPages) {
      this.pagination.page = page - 1; // Convertemos para 0-based index
      this.updatePages();
      this.applyPagination();
    }
  }

  // Aplica a paginação aos dados filtrados
  private applyPagination(): void {
    const startIndex = this.pagination.page * this.pagination.pageSize;
    const endIndex = startIndex + this.pagination.pageSize;
    this.filteredProperties = this.properties.slice(startIndex, endIndex);
  }

  // Atualiza o array de páginas visíveis
  private updatePages(): void {
    const maxVisiblePages = 5; // Número máximo de páginas visíveis
    this.pages = [];

    let startPage = Math.max(1, this.pagination.page + 1 - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(this.pagination.totalPages, startPage + maxVisiblePages - 1);

    // Ajusta se estiver no final
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      this.pages.push(i);
    }
  }

}