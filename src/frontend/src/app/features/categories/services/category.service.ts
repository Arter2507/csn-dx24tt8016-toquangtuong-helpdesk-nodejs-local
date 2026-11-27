import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { EMPTY, expand, map, reduce } from 'rxjs';
import { Category, CategoryInput, CategoryUpdate } from '../interfaces/category';
import { ApiResponse } from '../../../core/http/api-response';

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private readonly http = inject(HttpClient);
  private readonly url = '/api/v1/categories';
  list(search: string, page: number, sortBy: string, sortOrder: string, isActive: string) {
    let params = new HttpParams()
      .set('search', search)
      .set('page', page)
      .set('sortBy', sortBy)
      .set('sortOrder', sortOrder);
    if (isActive) params = params.set('isActive', isActive);
    return this.http.get<ApiResponse<Category[]>>(this.url, { params });
  }
  listAll(isActive = '') {
    const load = (page: number) => this.list('', page, 'name', 'asc', isActive);
    return load(1).pipe(
      expand((response) =>
        response.meta && response.meta.page < response.meta.totalPages
          ? load(response.meta.page + 1)
          : EMPTY,
      ),
      map((response) => response.data),
      reduce((rows, page) => [...rows, ...page], [] as Category[]),
    );
  }

  find(id: string) {
    return this.http.get<ApiResponse<Category>>(this.url + '/' + encodeURIComponent(id));
  }
  create(value: CategoryInput) {
    return this.http.post<ApiResponse<Category>>(this.url, value);
  }
  update(id: number, value: CategoryUpdate) {
    return this.http.patch<ApiResponse<Category>>(this.url + '/' + id, value);
  }
  batchState(ids: number[], isActive: boolean) {
    return this.http.patch<ApiResponse<{ count: number }>>(this.url + '/batch-state', {
      ids,
      isActive,
    });
  }
}
