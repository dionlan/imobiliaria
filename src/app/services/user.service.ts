import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { User, UserRole } from '../models/user.model';
import { Property } from '../models/property.model';
import { map, delay, catchError } from 'rxjs/operators';
import usersData from '../../assets/data/users.json';
import propertiesData from '../../assets/data/properties.json';

@Injectable({ providedIn: 'root' })
export class UserService {
  private usersCache: User[] = this.processUsers(usersData);
  private propertiesCache: Property[] = this.processProperties(propertiesData);

  constructor() { }

  private processProperties(rawProperties: any[]): Property[] {
    return rawProperties.map(property => ({
      ...property,
      createdAt: new Date(property.createdAt),
      updatedAt: new Date(property.updatedAt)
    }));
  }

  private processUsers(rawUsers: any[]): User[] {
    return rawUsers.map(user => ({
      ...user,
      createdAt: new Date(user.createdAt),
      updatedAt: new Date(user.updatedAt),
      role: this.mapRole(user.role)
    }));
  }

  private mapRole(roleString: string): UserRole {
    switch (roleString) {
      case 'ADMINISTRADOR': return UserRole.ADMIN;
      case 'GESTOR': return UserRole.MANAGER;
      case 'CORRETOR': return UserRole.AGENT;
      default: return UserRole.AGENT;
    }
  }

  getUsers(): Observable<User[]> {
    return of(this.usersCache).pipe(delay(500));
  }

  getActiveUsers(): Observable<User[]> {
    return this.getUsers().pipe(
      map(users => users.filter(user => user.isActive))
    );
  }

  getAgentsByManagers(managerIds: number[]): Observable<User[]> {
    console.log('Manager IDs recebidos:', managerIds); // Debug adicional

    return this.getUsersByRole(UserRole.AGENT).pipe(
      map(agents => {
        const filtered = agents.filter(agent => {
          const hasManager = agent.managers?.some(managerId =>
            managerIds.includes(managerId)
          );
          console.log(`Agente ${agent.name} (${agent.managers}) - Incluído: ${hasManager}`);
          return hasManager;
        });

        console.log('Resultado filtrado:', filtered.map(f => f.name));
        return filtered;
      })
    );
  }

  getUsersByRole(role: UserRole): Observable<User[]> {
    return this.getUsers().pipe(
      map(users => users.filter(user => user.role === role))
    );
  }

  getUserById(id: number): Observable<User | undefined> {
    return this.getUsers().pipe(
      map(users => users.find(user => user.id === id))
    );
  }

  getUserNameById(id: number): Observable<string> {
    return this.getUsers().pipe(
      map(users => {
        const user = users.find(u => u.id === id);
        if (!user) {
          throw new Error('Usuário não encontrado');
        }
        return user.name;
      }),
      catchError(() => of('')) // Retorna string vazia em caso de erro
    );
  }

  private generateNextUserId(): number {
    if (this.usersCache.length === 0) {
      return 1;
    }
    return Math.max(...this.usersCache.map(user => user.id)) + 1;
  }

  createUser(user: Omit<User, 'id'>): Observable<User> {
    const newUser: User = {
      ...user,
      id: this.generateNextUserId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true
    };

    this.usersCache.push(newUser);
    return of(newUser).pipe(delay(500));
  }

  updateUser(id: number, userData: Partial<User>): Observable<User> {
    return this.getUserById(id).pipe(
      map(user => {
        if (!user) throw new Error('Usuário não encontrado');

        const updatedUser = {
          ...user,
          ...userData,
          updatedAt: new Date()
        };

        const index = this.usersCache.findIndex(u => u.id === id);
        if (index !== -1) {
          this.usersCache[index] = updatedUser;
        }

        return updatedUser;
      }),
      delay(500)
    );
  }

  resetPassword(id: number, newPassword: string): Observable<boolean> {
    return of(true).pipe(delay(500));
  }

  deleteUser(id: number): Observable<boolean> {
    this.usersCache = this.usersCache.filter(user => user.id !== id);
    return of(true).pipe(delay(500));
  }

  getUserProperties(userId: number): Observable<Property[]> {
    return of(this.propertiesCache).pipe(
      map(properties => properties.filter(p =>
        p.managers.some(m => m.managerId === userId) ||
        p.agents?.includes(userId)
      )),
      delay(500)
    );
  }

  getUsersByIds(ids: number[]): Observable<User[]> {
    return this.getUsers().pipe(
      map(users => {
        // Filtra os usuários cujos IDs estão no array fornecido
        const filteredUsers = users.filter(user => ids.includes(user.id));

        // Verifica se todos os IDs solicitados foram encontrados
        const foundIds = filteredUsers.map(user => user.id);
        const missingIds = ids.filter(id => !foundIds.includes(id));

        if (missingIds.length > 0) {
          console.warn(`Os seguintes IDs de usuário não foram encontrados: ${missingIds.join(', ')}`);
        }

        return filteredUsers;
      }),
      catchError(error => {
        console.error('Erro ao buscar usuários por IDs:', error);
        return of([]);
      })
    );
  }

  getAvailableAgents(managerId: number): Observable<User[]> {
    return of(this.usersCache.filter(user =>
      user.role === UserRole.AGENT &&
      (!user.managers || !user.managers.includes(managerId))
    )).pipe(delay(500));
  }
}