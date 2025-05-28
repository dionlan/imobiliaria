import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ImageUploadService {
    private readonly CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/seu-account/upload';

    constructor(private http: HttpClient) { }

    uploadImage(file: File): Observable<any> {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', 'seu-upload-preset');
        return this.http.post(this.CLOUDINARY_URL, formData);
    }
}