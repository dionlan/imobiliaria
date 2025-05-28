import { Injectable } from '@angular/core';
import { MessageService } from 'primeng/api';

@Injectable({ providedIn: 'root' })
export class NotificationService {
    constructor(private messageService: MessageService) { }

    showSuccess(message: string): void {
        this.messageService.add({
            severity: 'success',
            summary: 'Sucesso',
            detail: message
        });
    }

    showError(message: string): void {
        this.messageService.add({
            severity: 'error',
            summary: 'Erro',
            detail: message
        });
    }

    showInfo(message: string): void {
        this.messageService.add({
            severity: 'info',
            summary: 'Informação',
            detail: message
        });
    }
}