import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user.service';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ImageUploadService } from '../../services/image-upload.service';

@Component({
    selector: 'app-profile',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './profile.component.html',
    styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {

    showCurrentPassword = false;
    showNewPassword = false;
    showConfirmPassword = false;
    isUploading = false;
    form: ReturnType<FormBuilder['group']>;
    
    constructor(
        public authService: AuthService,
        private userService: UserService,
        private fb: FormBuilder,
        private imageUploadService: ImageUploadService
    ) {
        this.form = this.fb.group({
            name: ['', Validators.required],
            email: ['', [Validators.required, Validators.email]],
            profileImage: [''],
            currentPassword: [''],
            newPassword: [''],
            confirmPassword: ['']
        });
    }

    ngOnInit(): void {
        const user = this.authService.getCurrentUser();
        if (user) {
            this.form.patchValue({
                name: user.name,
                email: user.email,
                profileImage: user.profileImage || 'assets/images/default-avatar.png'
            });
        }
    }

    uploadImage(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files.length > 0) {
            this.isUploading = true;
            const file = input.files[0];

            this.imageUploadService.uploadImage(file).subscribe({
                next: (response) => {
                    this.form.patchValue({
                        profileImage: response.secure_url
                    });
                    this.isUploading = false;
                    // Mostrar toast de sucesso aqui
                },
                error: () => {
                    this.isUploading = false;
                    // Mostrar toast de erro aqui
                }
            });
        }
    }

    onSubmit(): void {
        if (this.form.invalid || !this.authService.getCurrentUser()) return;

        const formValue = this.form.value;

        // Verificar se as senhas coincidem se nova senha foi fornecida
        if (formValue.newPassword && formValue.newPassword !== formValue.confirmPassword) {
            // Mostrar toast de erro
            return;
        }

        this.userService.updateUser(
            this.authService.getCurrentUser()!.id,
            {
                name: formValue.name ?? undefined,
                email: formValue.email ?? undefined,
                profileImage: formValue.profileImage ?? undefined
            }
        ).subscribe({
            next: () => {
                // Mostrar toast de sucesso
            },
            error: () => {
                // Mostrar toast de erro
            }
        });
    }

    cancel(): void {
        // Resetar o formulário ou navegar para outra página
    }
}