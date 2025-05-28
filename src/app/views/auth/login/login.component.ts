import { Component, Inject, PLATFORM_ID } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { CardModule } from 'primeng/card';
import { DividerModule } from 'primeng/divider';
import { CheckboxModule } from 'primeng/checkbox';
import { RippleModule } from 'primeng/ripple';
import { RouterModule } from '@angular/router';
import { CommonModule, isPlatformBrowser } from '@angular/common';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        ButtonModule,
        InputTextModule,
        PasswordModule,
        CardModule,
        DividerModule,
        CheckboxModule,
        RippleModule,
        RouterModule
    ],
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.scss']
})
export class LoginComponent {
    loginForm: ReturnType<FormBuilder['group']>;
    loading = false;
    passwordVisible = false;

    constructor(
        private fb: FormBuilder,
        private authService: AuthService,
        private router: Router,
        private messageService: MessageService,
        @Inject(PLATFORM_ID) private platformId: Object
    ) {
        this.loginForm = this.fb.group({
            email: ['', [Validators.required, Validators.email]],
            password: ['', Validators.required],
            rememberMe: [false]
        });

        // Verifica se está no navegador antes de acessar localStorage
        if (isPlatformBrowser(this.platformId)) {
            const rememberedEmail = localStorage.getItem('rememberedEmail');
            if (rememberedEmail) {
                this.loginForm.patchValue({
                    email: rememberedEmail,
                    rememberMe: true
                });
            }
        }
    }

    onSubmit(): void {
        if (this.loginForm.invalid) return;

        this.loading = true;
        const { email, password, rememberMe } = this.loginForm.value;

        this.authService.login(email!, password!).subscribe({
            next: () => {
                if (isPlatformBrowser(this.platformId)) {
                    if (rememberMe) {
                        localStorage.setItem('rememberedEmail', email!);
                    } else {
                        localStorage.removeItem('rememberedEmail');
                    }
                }
                this.router.navigate(['/dashboard']);
            },
            error: (err) => {
                this.loading = false;
                this.messageService.add({
                    severity: 'error',
                    summary: 'Erro',
                    detail: err.message || 'Falha no login',
                    life: 5000
                });
            }
        });
    }

    togglePasswordVisibility(): void {
        this.passwordVisible = !this.passwordVisible;
    }

    // Método auxiliar para acessar localStorage com segurança
    private safeLocalStorageAccess(key: string, action: 'get' | 'set' | 'remove', value?: string): void | string | null {
        if (isPlatformBrowser(this.platformId)) {
            switch (action) {
                case 'get':
                    return localStorage.getItem(key);
                case 'set':
                    if (value) localStorage.setItem(key, value);
                    break;
                case 'remove':
                    localStorage.removeItem(key);
                    break;
            }
        }
        return null;
    }
}