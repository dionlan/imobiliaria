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

@Component({
  selector: 'app-property-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    AsyncPipe,
    TruncatePipe,
    AdvancedFilterComponent
  ],
  templateUrl: './property-list.component.html',
  styleUrls: ['./property-list.component.scss']
})

export class PropertyListComponent implements OnInit {
  properties: Property[] = [];
  result: any[] = [];
  filteredProperties: Property[] = [];
  loading = true;
  sortField = 'name';
  sortOrder = 1; // 1 para ascendente, -1 para descendente
  managerNamesMap: Map<number, Observable<string>> = new Map();

  constructor(
    private propertyService: PropertyService,
    public authService: AuthService,
    private userService: UserService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadProperties();
  }

  loadProperties(): void {
    this.loading = true;
    this.propertyService.getPropertiesNovo().subscribe({
      next: (properties) => {
        this.result = properties;
        console.log('EMPREENDIMENTOS: ', this.result);
        this.properties = this.filterPropertiesByRole(properties);
        this.filteredProperties = [...this.properties];
        this.loading = false;
        this.initializeManagerNamesMap();
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
    const uniqueManagerIds = [
      ...new Set(
        this.properties
          .flatMap(p => p.managers)
          .map(m => m.managerId)
      )
    ];
    console.log('Gestores únicos encontrados:', uniqueManagerIds);

    uniqueManagerIds.forEach(id => {
      this.managerNamesMap.set(id, this.userService.getUserNameById(id).pipe(
        catchError(() => {
          console.error('Erro ao carregar gestor com ID:', id);
          return of('Gestor não encontrado');
        }),
        startWith('Carregando...')
      ));
    });
  }

  applyFilter(filter: any): void {
    if (!filter || Object.keys(filter).length === 0) {
      this.filteredProperties = [...this.properties];
      return;
    }

    this.filteredProperties = this.properties.filter(property => {
      const matchesSearch = filter.searchTerm ?
        property.name.toLowerCase().includes(filter.searchTerm.toLowerCase()) ||
        property.address.toLowerCase().includes(filter.searchTerm.toLowerCase()) : true;

      const matchesStatus = filter.status ?
        property.isActive === (filter.status === 'active') : true;

      return matchesSearch && matchesStatus;
    });
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
}