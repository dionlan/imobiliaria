import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './sidebar/sidebar.component';
import { HeaderComponent } from './header/header.component';
import { FooterComponent } from './footer/footer.component';
import { SidebarService } from '../../services/sidebar.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent, HeaderComponent, FooterComponent],
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss']
})
export class LayoutComponent {
  readonly sidebarService = inject(SidebarService);

  // Calcula a altura do conteúdo principal considerando header e footer
  get contentMinHeight() {
    return 'calc(100vh - 112px)'; // 64px (header) + 48px (footer)
  }
}

/* 
import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { MenuItem } from 'primeng/api';

@Component({
  selector: 'app-layout',
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss']
})
export class LayoutComponent implements OnInit {
  sidebarVisible = true;
  menuItems: MenuItem[] = [];

  constructor(public authService: AuthService) {}

  ngOnInit(): void {
    this.buildMenu();
  }

  private buildMenu(): void {
    this.menuItems = [
      {
        label: 'Dashboard',
        icon: 'pi pi-home',
        routerLink: ['/dashboard']
      }
    ];

    if (this.authService.isAdmin()) {
      this.menuItems.push(
        {
          label: 'Usuários',
          icon: 'pi pi-users',
          routerLink: ['/users'],
          visible: this.authService.isAdmin()
        },
        {
          label: 'Empreendimentos',
          icon: 'pi pi-building',
          routerLink: ['/properties']
        }
      );
    } else if (this.authService.isManager()) {
      this.menuItems.push({
        label: 'Empreendimentos',
        icon: 'pi pi-building',
        routerLink: ['/properties']
      });
    }

    this.menuItems.push({
      label: 'Perfil',
      icon: 'pi pi-user',
      routerLink: ['/profile']
    });
  }

  logout(): void {
    this.authService.logout();
  }
} */