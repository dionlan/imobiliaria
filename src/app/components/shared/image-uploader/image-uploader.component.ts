import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FileUploadModule } from 'primeng/fileupload';
import { HttpClient } from '@angular/common/http';

@Component({
    selector: 'app-image-uploader',
    standalone: true,
    imports: [CommonModule, FileUploadModule],
    templateUrl: './image-uploader.component.html',
    styleUrls: ['./image-uploader.component.scss']
})
export class ImageUploaderComponent {
    @Output() uploadComplete = new EventEmitter<string[]>();
    uploadedFiles: string[] = [];

    constructor(private http: HttpClient) { }

    onUpload(event: any): void {
        // Simulação de upload
        const newFiles = event.files.map((file: any) =>
            URL.createObjectURL(file)
        );
        this.uploadedFiles = [...this.uploadedFiles, ...newFiles];
        this.uploadComplete.emit(this.uploadedFiles);
    }
}