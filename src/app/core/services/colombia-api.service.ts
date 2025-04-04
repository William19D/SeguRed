import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ColombiaApiService {
  private apiUrl = 'https://api-colombia.com/api/v1';

  constructor(private http: HttpClient) {}

  getDepartments(): Observable<any> {
    return this.http.get(`${this.apiUrl}/Department`);
  }

  getCitiesByDepartment(departmentId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/Department/${departmentId}/cities`);
  }
}