import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ApiResponse, Category, CategoryInput, CategoryUpdate } from '../interfaces/category';

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private readonly http = inject(HttpClient);
  private readonly url = '/api/v1/categories';
  list(search: string, page: number, sortBy: string, sortOrder: string, isActive: string) {
    let params = new HttpParams().set('search', search).set('page', page).set('sortBy', sortBy).set('sortOrder', sortOrder);
    if (isActive) params = params.set('isActive', isActive);
    return this.http.get<ApiResponse<Category[]>>(this.url, { params });
  }
  find(id: string) { return this.http.get<ApiResponse<Category>>(this.url + '/' + encodeURIComponent(id)); }
  create(value: CategoryInput) { return this.http.post<ApiResponse<Category>>(this.url, value); }
  update(id: number, value: CategoryUpdate) { return this.http.patch<ApiResponse<Category>>(this.url + '/' + id, value); }
}
