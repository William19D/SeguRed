import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class NominatimService {
  private apiUrl = 'https://nominatim.openstreetmap.org/reverse';

  constructor(private http: HttpClient) {}

  reverseGeocode(lat: number, lng: number): Observable<any> {
    const url = `${this.apiUrl}?format=json&lat=${lat}&lon=${lng}`;
    return this.http.get(url);
  }
}