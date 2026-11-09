import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ApiResponse } from '../categories/interfaces/category';
import { Resource, Row, Value } from './workspace.types';

@Injectable({ providedIn: 'root' })
export class WorkspaceService {
  private readonly http = inject(HttpClient);

  list(resource: Resource, query: Record<string, string | number>) {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== '') params = params.set(key, value);
    }
    return this.http.get<ApiResponse<Row[]>>('/api/v1/' + resource, { params });
  }

  find(resource: Resource, id: string) {
    return this.http.get<ApiResponse<Row>>('/api/v1/' + resource + '/' + encodeURIComponent(id));
  }

  save(resource: Resource, id: number | null, input: Record<string, Value>) {
    const url = '/api/v1/' + resource;
    return id === null ? this.http.post(url, input) : this.http.patch(url + '/' + id, input);
  }
}
