import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';
import { AuthService } from './services/auth.service';
import { inject } from '@angular/core';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./views/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: '',
    canActivate: [AuthGuard],
    loadComponent: () => import('./components/layout/layout.component').then(m => m.LayoutComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', loadComponent: () => import('./views/dashboard/dashboard.component').then(m => m.DashboardComponent) },
      {
        path: 'users',
        canMatch: [() => inject(AuthService).isAdmin()],
        children: [
          { path: '', loadComponent: () => import('./views/users/user-list/user-list.component').then(m => m.UserListComponent) },
          { path: 'new', loadComponent: () => import('./views/users/user-form/user-form.component').then(m => m.UserFormComponent) },
          { path: ':id', loadComponent: () => import('./views/users/user-view/user-view.component').then(m => m.UserViewComponent) },
          { path: ':id/edit', loadComponent: () => import('./views/users/user-form/user-form.component').then(m => m.UserFormComponent) },
          { path: ':id/team', loadComponent: () => import('./components/users/manager-agent-association/manager-agent-association.component').then(m => m.ManagerAgentAssociationComponent) }
        ]
      },
      {
        path: 'properties',
        children: [
          { path: '', loadComponent: () => import('./views/properties/property-list/property-list.component').then(m => m.PropertyListComponent) },
          {
            path: 'new',
            canMatch: [() => inject(AuthService).isAdmin()],
            loadComponent: () => import('./views/properties/property-form/property-form.component').then(m => m.PropertyFormComponent)
          },
          { path: ':id', loadComponent: () => import('./views/properties/property-view/property-view.component').then(m => m.PropertyViewComponent) },
          {
            path: ':id/edit',
            canMatch: [() => inject(AuthService).isAdmin()],
            loadComponent: () => import('./views/properties/property-form/property-form.component').then(m => m.PropertyFormComponent)
          }
        ]
      },
      { path: 'profile', loadComponent: () => import('./views/profile/profile.component').then(m => m.ProfileComponent) }
    ]
  },
  { path: '**', redirectTo: 'dashboard' }
];