import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { SidebarService } from '../../../services/sidebar.service';

@Component({
    selector: 'app-header',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './header.component.html',
    styleUrls: ['./header.component.scss']
})
export class HeaderComponent {
    protected authService = inject(AuthService);
    protected sidebarService = inject(SidebarService);

    isProfileMenuOpen = false;
    hasUnreadNotifications = false;
    appName = 'Gestão Simóvel';

    get userInitial(): string {
        return this.authService.getCurrentUser()?.name?.charAt(0) || 'U';
    }

    get userName(): string {
        return this.authService.getCurrentUser()?.name || 'Usuário';
    }

    toggleProfileMenu(): void {
        this.isProfileMenuOpen = !this.isProfileMenuOpen;
    }

    closeProfileMenu(): void {
        this.isProfileMenuOpen = false;
    }

    toggleSidebar() {
        this.sidebarService.toggle();
    }
}