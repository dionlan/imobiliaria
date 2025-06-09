import { inject, Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { User, UserRole } from '../models/user.model';
import { Property } from '../models/property.model';
import { map, delay, catchError, shareReplay } from 'rxjs/operators';
import usersData from '../../assets/data/users.json';
import propertiesData from '../../assets/data/properties.json';
import { environment } from '../environment';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class UserService {
  private apiUrl = `${environment.apiUrl}/users-gestao`;
  private http = inject(HttpClient);
  private usersCache: User[] = this.processUsers(usersData);
  private propertiesCache: Property[] = this.processProperties(propertiesData);
  private usersCache$!: Observable<User[]>;
  private propertiesCache$!: Observable<Property[]>;
  private currentUser: User | null = null;

  constructor() {
    this.initializeCaches();
  }

  private initializeCaches(): void {
    this.usersCache$ = this.http.get<User[]>(this.apiUrl).pipe(
      catchError(this.handleError),
      shareReplay(1) // Cache compartilhado para múltiplos assinantes
    );

    this.usersCache$.subscribe(users => {
      console.log('USUÁRIOS CACHE:', users);
    });

    this.propertiesCache$ = this.http.get<Property[]>(`${environment.apiUrl}/properties`).pipe(
      catchError(this.handleError),
      shareReplay(1)
    );
  }

  private handleError(error: HttpErrorResponse) {
    console.error('Ocorreu um erro:', error);
    if (error.error instanceof ErrorEvent) {
      console.error('Client-side ou erro de rede', error.error.message);
    } else {
      console.error(`Backend respondeu o código ${error.status}, ERRO:`, error.error);
    }
    return throwError(() => new Error('Algo ruim aconteceu; por favor, tente novamente.'));
  }

  /* getUsers(): Observable<User[]> {
    return of(this.usersCache).pipe(delay(500));
  }

  getUserById(id: number): Observable<User | undefined> {
    return this.getUsers().pipe(
      map(users => users.find(user => user.id === id))
    );
  } */

  // Métodos básicos de CRUD
  getUsers(): Observable<User[]> {
    return this.usersCache$;
  }

  getUserById(id: number): Observable<User | undefined> {
    return this.getUsers().pipe(
      map(users => users.find(user => user.id === id))
    );
  }

  getUsersNovo(): Observable<User[]> {
    return this.http.get<User[]>(this.apiUrl).pipe(
      catchError(this.handleError)
    );
  }

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

  getAgentsByManagers(managerIds: number[]): Observable<User[]> {
    console.log('Manager IDs recebidos:', managerIds); // Debug adicional
    return this.getUsersByRole(UserRole.AGENT).pipe(
      map(agents => {
        console.log('CORRETORES DOS GESTEORES: ', agents)
        const filtered = agents.filter(agent => {
          const hasManager = agent.managers?.some(managerId =>
            managerIds.includes(managerId)
          );
          return hasManager;
        });

        console.log('Resultado filtrado:', filtered.map(f => f.name));
        return filtered;
      })
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
    return this.http.post<User>(this.apiUrl, user).pipe(
      catchError(this.handleError),
      // Atualiza o cache após criação
      map(newUser => {
        this.initializeCaches(); // Recarrega cache
        return newUser;
      })
    );
  }

  updateUser(id: number, userData: Partial<User>): Observable<User> {
    return this.http.patch<User>(`${this.apiUrl}/${id}`, userData).pipe(
      catchError(this.handleError),
      // Atualiza o cache após atualização
      map(updatedUser => {
        this.initializeCaches(); // Recarrega cache
        return updatedUser;
      })
    );
  }

  deleteUser(id: number): Observable<boolean> {
    return this.http.delete<boolean>(`${this.apiUrl}/${id}`).pipe(
      catchError(this.handleError),
      // Atualiza o cache após exclusão
      map(success => {
        if (success) this.initializeCaches();
        return success;
      })
    );
  }

  // Métodos específicos para perfis
  getAllAgents(): Observable<User[]> {
    return this.getUsersByRole(UserRole.AGENT);
  }

  getAllManagers(): Observable<User[]> {
    return this.getUsersByRole(UserRole.MANAGER);
  }

  getUsersByRole(role: UserRole): Observable<User[]> {
    return this.getUsers().pipe(
      map(users => users.filter(user => user.role === role))
    );
  }

  // Métodos de relacionamento
  getAgentsByManager(managerId: number): Observable<User[]> {
    return this.getAllAgents().pipe(
      map(agents => agents.filter(agent =>
        agent.managerId === managerId
      )))
  }

  getAvailableAgents(managerId: number): Observable<User[]> {
    return this.getAllAgents().pipe(
      map(agents => agents.filter(agent =>
        !agent.managerId || agent.managerId !== managerId
      )))
  }

  linkAgentToManager(agentId: number, managerId: number): Observable<User> {
    return this.http.patch<User>(`${this.apiUrl}/${agentId}`, { managerId }).pipe(
      catchError(this.handleError),
      map(updatedAgent => {
        this.initializeCaches(); // Recarrega cache
        return updatedAgent;
      })
    );
  }

  unlinkAgentFromManager(agentId: number): Observable<User> {
    return this.http.patch<User>(`${this.apiUrl}/${agentId}`, { managerId: null }).pipe(
      catchError(this.handleError),
      map(updatedAgent => {
        this.initializeCaches(); // Recarrega cache
        return updatedAgent;
      })
    );
  }

  // Métodos de propriedades
  getAllProperties(): Observable<Property[]> {
    return this.propertiesCache$;
  }

  getUserProperties(userId: number): Observable<Property[]> {
    return this.getAllProperties().pipe(
      map(properties => properties.filter(property =>
        property.managers.some(m => m.managerId === userId) ||
        property.agents?.includes(userId)
      )
      ));
  }

  // Métodos auxiliares
  getUsersByIds(ids: number[]): Observable<User[]> {
    return this.getUsers().pipe(
      map(users => users.filter(user => ids.includes(user.id))))
  }

  getActiveUsers(): Observable<User[]> {
    return this.getUsers().pipe(
      map(users => users.filter(user => user.isActive)))
  }

  resetPassword(id: number, newPassword: string): Observable<boolean> {
    return this.http.patch<boolean>(`${this.apiUrl}/${id}/reset-password`, { newPassword }).pipe(
      catchError(this.handleError))
  }

  getCurrentUser(): User | null {
    // Se já temos o usuário em memória, retorna
    if (this.currentUser) {
      return this.currentUser;
    }

    // Tenta recuperar do localStorage/sessionStorage
    const userData = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');

    if (userData) {
      try {
        this.currentUser = JSON.parse(userData);
        return this.currentUser;
      } catch (e) {
        console.error('Error parsing user data', e);
        this.clearUserData();
      }
    }

    return null;
  }

  private clearUserData(): void {
    this.currentUser = null;
    localStorage.removeItem('currentUser');
    sessionStorage.removeItem('currentUser');
  }

  /* createUser(user: Omit<User, 'id'>): Observable<User> {
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

  getActiveUsers(): Observable<User[]> {
    return this.getUsers().pipe(
      map(users => users.filter(user => user.isActive))
    );
  }

  getUsersByRole(role: UserRole): Observable<User[]> {
    return this.getUsers().pipe(
      map(users => users.filter(user => user.role === role))
    );
  }

  */
}