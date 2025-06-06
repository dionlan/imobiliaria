import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environment';
import { Campaign, CampaignCreateDto, CampaignUpdateDto } from '../models/campaing.model';
import { CampaignPaginadoResponse } from '../models/campaign-paginado.model';

@Injectable({
    providedIn: 'root'
})
export class CampaignService {
    private apiUrl = `${environment.apiUrl}/campaigns`;

    constructor(private http: HttpClient) { }

    getAllCampaigns(): Observable<Campaign[]> {
        return this.http.get<Campaign[]>(this.apiUrl);
    }

    getAllCampaignsPaginada(page: number = 0, size: number = 10): Observable<CampaignPaginadoResponse> {
        const params = new HttpParams()
            .set('page', page.toString())
            .set('size', size.toString());

        return this.http.get<CampaignPaginadoResponse>(this.apiUrl, { params });
    }

    getCampaignById(id: number): Observable<Campaign> {
        return this.http.get<Campaign>(`${this.apiUrl}/${id}`);
    }

    createCampaign(campaign: CampaignCreateDto): Observable<Campaign> {
        return this.http.post<Campaign>(this.apiUrl, campaign);
    }

    updateCampaign(id: number, campaign: CampaignUpdateDto): Observable<Campaign> {
        return this.http.patch<Campaign>(`${this.apiUrl}/${id}`, campaign);
    }

    deleteCampaign(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`);
    }

    associateWithProperty(campaignId: number, propertyId: number): Observable<Campaign> {
        return this.http.post<Campaign>(`${this.apiUrl}/${campaignId}/properties/${propertyId}`, {});
    }

    removeFromProperty(campaignId: number, propertyId: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${campaignId}/properties/${propertyId}`);
    }
}