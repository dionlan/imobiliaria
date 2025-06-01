import { inject, Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { map, delay, switchMap, catchError } from 'rxjs/operators';
import { Property, PropertyStatus, PropertyManager } from '../models/property.model';
import { User, UserRole } from '../models/user.model';
import propertiesData from '../../assets/data/properties.json';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../environment';

@Injectable({ providedIn: 'root' })
export class PropertyService {

  private apiUrl = `${environment.apiUrl}/properties`;

  http = inject(HttpClient);

  private propertiesCache: Property[] = propertiesData.map(p => ({
    ...p,
    status: (p as any).status ? (p as any).status as PropertyStatus : PropertyStatus.ACTIVE,
    createdAt: new Date(p.createdAt),
    updatedAt: new Date(p.updatedAt),
    managers: this.mapManagers(p.managers || []),
    isActive: p.isActive !== false, // Default to true if not specified
    city: p.city || '', // Ensure required fields are present
    state: p.state || '',
    zipCode: p.zipCode || ''
  }));

  constructor() { }

  private handleError(error: HttpErrorResponse) {
    console.error('Ocorreu um erro:', error);
    if (error.error instanceof ErrorEvent) {
      console.error('Client-side ou erro de rede', error.error.message);
    } else {
      console.error(`Backend respondeu o código ${error.status}, ERRO:`, error.error);
    }
    return throwError(() => new Error('Algo ruim aconteceu; por favor, tente novamente.'));
  }

  getPropertiesNovo(): Observable<Property[]> {
    return this.http.get<Property[]>(this.apiUrl).pipe(
      catchError(this.handleError)
    );
  }

  private mapManagers(managers: any[]): PropertyManager[] {
    return managers.map(m => ({
      managerId: m.managerId || m.id || m, // Supports multiple formats
      agents: (m.agents || []).map((a: any) => ({
        agentId: a.agentId || a.id || a
      }))
    }));
  }

  getProperties(): Observable<Property[]> {
    return of(this.propertiesCache).pipe(delay(500));
  }

  getPropertyById(id: number): Observable<Property> {
    const property = this.propertiesCache.find(p => p.id === id);
    if (!property) {
      throw new Error('Empreendimento não encontrado');
    }
    return of(property).pipe(delay(500));
  }

  createProperty(propertyData: Omit<Property, 'id' | 'createdAt' | 'updatedAt'>): Observable<Property> {
    const newProperty: Property = {
      ...propertyData,
      id: this.generateNextPropertyId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      status: propertyData.status || PropertyStatus.ACTIVE,
      managers: propertyData.managers || [],
      isActive: propertyData.isActive !== false
    };
    this.propertiesCache.push(newProperty);
    return of(newProperty).pipe(delay(500));
  }

  private generateNextPropertyId(): number {
    return this.propertiesCache.length > 0
      ? Math.max(...this.propertiesCache.map(p => p.id)) + 1
      : 1;
  }

  updateProperty(id: number, propertyData: Partial<Property>): Observable<Property> {
    return this.getPropertyById(id).pipe(
      map(property => {
        const updatedProperty = {
          ...property,
          ...propertyData,
          updatedAt: new Date()
        };
        this.propertiesCache = this.propertiesCache.map(p =>
          p.id === id ? updatedProperty : p
        );
        return updatedProperty;
      }),
      delay(500)
    );
  }

  deleteProperty(id: number): Observable<boolean> {
    const index = this.propertiesCache.findIndex(p => p.id === id);
    if (index === -1) return of(false);

    this.propertiesCache.splice(index, 1);
    return of(true).pipe(delay(500));
  }

  getPropertiesByManager(managerId: number): Observable<Property[]> {
    return of(this.propertiesCache.filter(p =>
      p.managers.some(m => m.managerId === managerId)
    )).pipe(delay(500));
  }

  addManagerToProperty(propertyId: number, managerId: number): Observable<Property> {
    return this.getPropertyById(propertyId).pipe(
      map(property => {
        if (property.managers.some(m => m.managerId === managerId)) {
          throw new Error('Gestor já vinculado ao empreendimento');
        }
        return [
          ...property.managers,
          { managerId, agents: [] }
        ];
      }),
      // Use switchMap to flatten the observable returned by updateProperty
      switchMap(managers =>
        this.updateProperty(propertyId, { managers })
      ),
      delay(500)
    );
  }

  /*removeManagerFromProperty(propertyId: number, managerId: number): Observable<Property> {
    return this.getPropertyById(propertyId).pipe(
      map((property: Property): PropertyManager[] => {
        if (property.managers.length <= 1) {
          throw new Error('O empreendimento deve ter pelo menos um gestor');
        }

        return property.managers.filter((m: PropertyManager) => m.managerId !== managerId);
      }),
      switchMap((managers: PropertyManager[]) =>
        this.updateProperty(propertyId, { managers })
      ),
      delay(500)
    );
  }*/

  addAgentToManager(propertyId: number, managerId: number, agentId: number): Observable<Property> {
    return this.getPropertyById(propertyId).pipe(
      switchMap(property => {
        const managerIndex = property.managers.findIndex(m => m.managerId === managerId);
        if (managerIndex === -1) {
          throw new Error('Gestor não encontrado no empreendimento');
        }

        if (property.managers[managerIndex].agents.some(a => a.agentId === agentId)) {
          throw new Error('Corretor já vinculado ao gestor');
        }

        const updatedManagers = [...property.managers];
        updatedManagers[managerIndex] = {
          ...updatedManagers[managerIndex],
          agents: [...updatedManagers[managerIndex].agents, { agentId }]
        };

        return this.updateProperty(propertyId, {
          managers: updatedManagers
        });
      }),
      delay(500)
    );
  }

  /*removeAgentFromManager(propertyId: number, managerId: number, agentId: number): Observable<Property> {
    return this.getPropertyById(propertyId).pipe(
      switchMap(property => {
        const managerIndex = property.managers.findIndex(m => m.managerId === managerId);
        if (managerIndex === -1) {
          throw new Error('Gestor não encontrado no empreendimento');
        }

        const updatedManagers = [...property.managers];
        updatedManagers[managerIndex] = {
          ...updatedManagers[managerIndex],
          agents: updatedManagers[managerIndex].agents.filter(a => a.agentId !== agentId)
        };

        return this.updateProperty(propertyId, {
          managers: updatedManagers
        });
      }),
      delay(500)
    );
  }*/

  enrichPropertyWithUsers(property: Property, users: User[]): Property {
    return {
      ...property,
      managers: property.managers.map(manager => ({
        ...manager,
        manager: users.find(u => u.id === manager.managerId),
        agents: manager.agents.map(agent => ({
          ...agent,
          agent: users.find(u => u.id === agent.agentId)
        }))
      }))
    };
  }

  removeManagerFromProperty(propertyId: number, managerId: number): Observable<Property> {
    return this.getPropertyById(propertyId).pipe(
      map(property => {
        // Filtra para remover o gestor
        const updatedManagers = property.managers.filter(m => m.managerId !== managerId);

        // Garante que pelo menos um gestor permaneça
        if (updatedManagers.length === 0) {
          throw new Error('O empreendimento deve ter pelo menos um gestor');
        }

        return {
          ...property,
          managers: updatedManagers
        };
      })
    );
  }

  removeAgentFromManager(propertyId: number, managerId: number, agentId: number): Observable<Property> {
    return this.getPropertyById(propertyId).pipe(
      map(property => {
        return {
          ...property,
          managers: property.managers.map(manager => {
            if (manager.managerId === managerId) {
              return {
                ...manager,
                agents: manager.agents.filter(a => a.agentId !== agentId)
              };
            }
            return manager;
          })
        };
      })
    );
  }

  updatePropertyStatus(propertyId: number, status: PropertyStatus): Observable<Property> {
    return this.updateProperty(propertyId, {
      status,
      isActive: status === PropertyStatus.ACTIVE
    });
  }

  getActiveProperties(): Observable<Property[]> {
    return of(this.propertiesCache.filter(p =>
      p.status === PropertyStatus.ACTIVE
    )).pipe(delay(500));
  }
}