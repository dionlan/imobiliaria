import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { map, catchError, delay } from 'rxjs/operators';
import { isPlatformBrowser } from '@angular/common';
import { User, UserRole } from '../models/user.model';
import usersData from '../../assets/data/users.json';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  currentUser$ = this.currentUserSubject.asObservable();
  private users: User[] = this.processUsers(usersData);

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private router: Router
  ) { }

  login(email: string, password: string): Observable<User> {
    return of(this.users).pipe(
      map(users => {
        const user = users.find(u => 
          u.email.toLowerCase() === email.toLowerCase() && 
          u.isActive
        );
        
        if (!user) throw new Error('Usuário não encontrado ou conta desativada');
        if (password !== '123456') throw new Error('Senha incorreta');
        
        this.setCurrentUser(user);
        return user;
      }),
      catchError(error => throwError(() => error))
    );
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
    switch(roleString) {
      case 'ADMINISTRADOR': return UserRole.ADMIN;
      case 'GESTOR': return UserRole.MANAGER;
      case 'CORRETOR': return UserRole.AGENT;
      default: return UserRole.AGENT;
    }
  }

  private setCurrentUser(user: User): void {
    this.currentUserSubject.next(user);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('currentUser', JSON.stringify(user));
    }
  }

  getCurrentUser(): User | null {
    if (!this.currentUserSubject.value && isPlatformBrowser(this.platformId)) {
      const user = localStorage.getItem('currentUser');
      if (user) this.currentUserSubject.next(JSON.parse(user));
    }
    return this.currentUserSubject.value;
  }

  logout(): void {
    this.currentUserSubject.next(null);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('currentUser');
    }
    this.router.navigate(['/login']);
  }

  resetPassword(email: string): Observable<boolean> {
    return of(true).pipe(delay(500));
  }

  hasRole(role: UserRole): boolean {
    const user = this.getCurrentUser();
    return user?.role === role;
  }

  isAdmin(): boolean {
    return this.hasRole(UserRole.ADMIN);
  }

  isManager(): boolean {
    return this.hasRole(UserRole.MANAGER);
  }

  isAgent(): boolean {
    return this.hasRole(UserRole.AGENT);
  }

  get isAuthenticated(): boolean {
    return this.getCurrentUser() !== null;
  }

  // Métodos seguros para acesso ao localStorage
  private setLocalStorage(key: string, value: any): void {
    if (isPlatformBrowser(this.platformId)) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (e) {
        console.error('Erro ao salvar no localStorage:', e);
      }
    }
  }

  private getLocalStorage(key: string): string | null {
    if (isPlatformBrowser(this.platformId)) {
      try {
        return localStorage.getItem(key);
      } catch (e) {
        console.error('Erro ao acessar localStorage:', e);
        return null;
      }
    }
    return null;
  }

  private removeLocalStorage(key: string): void {
    if (isPlatformBrowser(this.platformId)) {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        console.error('Erro ao remover do localStorage:', e);
      }
    }
  }
}