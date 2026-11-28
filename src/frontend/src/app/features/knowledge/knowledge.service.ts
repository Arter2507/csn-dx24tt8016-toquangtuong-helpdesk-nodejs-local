import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ApiResponse } from '../../core/http/api-response';
import { silentRequest } from '../../core/http/network-progress';

export interface Article {
  id: number;
  title: string;
  category: string | null;
  categoryId: number | null;
  visibility: 'PUBLIC' | 'INTERNAL';
  updatedAt: string;
  excerpt?: string;
  body?: string;
}

export type ArticleForm = Pick<Article, 'title' | 'categoryId' | 'visibility'> & { body: string };

@Injectable({ providedIn: 'root' })
export class KnowledgeService {
  private readonly http = inject(HttpClient);
  private readonly url = '/api/v1/knowledge';

  list(
    q: string,
    {
      publicOnly = false,
      categoryId = null,
      before = null,
      limit = 20,
    }: {
      publicOnly?: boolean;
      categoryId?: number | null;
      before?: number | null;
      limit?: number;
    } = {},
  ) {
    let params = new HttpParams().set('q', q.trim().slice(0, 200)).set('limit', limit);
    if (publicOnly) params = params.set('publicOnly', 'true');
    if (categoryId) params = params.set('categoryId', categoryId);
    if (before) params = params.set('before', before);
    return this.http.get<ApiResponse<Article[]>>(this.url, {
      params,
      context: new HttpContext().set(silentRequest, true),
    });
  }

  categories() {
    return this.http.get<ApiResponse<{ id: number; name: string }[]>>(this.url + '/categories');
  }

  find(id: string, publicOnly = false) {
    const params = publicOnly ? new HttpParams().set('publicOnly', 'true') : undefined;
    return this.http.get<ApiResponse<Article>>(this.url + '/' + encodeURIComponent(id), { params });
  }

  save(form: ArticleForm, id?: number) {
    return id
      ? this.http.put<ApiResponse<{ id: number }>>(this.url + '/' + id, form)
      : this.http.post<ApiResponse<{ id: number }>>(this.url, form);
  }

  archive(id: number) {
    return this.http.delete(this.url + '/' + id);
  }
}
