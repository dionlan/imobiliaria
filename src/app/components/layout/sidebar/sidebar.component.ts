import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { SidebarService } from '../../../services/sidebar.service';
import { MenuItem } from 'primeng/api';
import { PrimeIcons } from 'primeng/api';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent implements OnInit {
  private authService = inject(AuthService);
  private sidebarService = inject(SidebarService);

  // Expor apenas o necessário para o template
  menuItems: MenuItem[] = [];
  currentYear = new Date().getFullYear();
  isSidebarVisible = this.sidebarService.visible;

  // Propriedades computadas para o template
  get userInitial(): string {
    return this.authService.getCurrentUser()?.name?.charAt(0) || 'U';
  }

  get userName(): string | null {
    return this.authService.getCurrentUser()?.name || null;
  }

  get userRole(): string | null {
    return this.authService.getCurrentUser()?.role || null;
  }

  ngOnInit(): void {
    this.buildMenu();
  }

  private buildMenu(): void {
    const baseItems: MenuItem[] = [
      {
        label: 'Dashboard',
        icon: PrimeIcons.HOME,
        routerLink: ['/dashboard'],
        routerLinkActiveOptions: { exact: true }
      },
      {
        label: 'Empreendimentos',
        icon: PrimeIcons.BUILDING,
        routerLink: ['/properties']
      },
      {
        label: 'Usuários',
        icon: PrimeIcons.USER_EDIT,
        routerLink: ['/users']
      }
    ];

    const adminItems: MenuItem[] = [
      {
        label: 'Campanhas',
        icon: PrimeIcons.MEGAPHONE,
        routerLink: ['/campaigns']
      },
      {
        label: 'Clientes',
        icon: PrimeIcons.USERS,
        routerLink: ['/clients'],
        badge: 'Novo'
      }
      /* {
        label: 'Relatórios',
        icon: PrimeIcons.CHART_BAR,
        routerLink: ['/reports']
      } */
    ];

    const managerItems: MenuItem[] = [
      {
        label: 'Equipe',
        icon: PrimeIcons.USERS,
        routerLink: ['/team']
      }
    ];

    const commonItems: MenuItem[] = [
      {
        label: 'Perfil',
        icon: PrimeIcons.USER,
        routerLink: ['/profile']
      },
      /* {
        label: 'Configurações',
        icon: PrimeIcons.COG,
        routerLink: ['/settings']
      } */
    ];

    this.menuItems = [...baseItems];

    if (this.authService.isAdmin()) {
      this.menuItems.push(...adminItems);
    }

    if (this.authService.isManager()) {
      this.menuItems.push(...managerItems);
    }

    this.menuItems.push(...commonItems);
  }

  logout(): void {
    this.authService.logout();
  }
}