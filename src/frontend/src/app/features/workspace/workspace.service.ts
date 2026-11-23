import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { EMPTY, expand, map, reduce } from 'rxjs';
import { ApiResponse } from '../categories/interfaces/category';
import { Session } from '../../session';
import { Attachment, Resource, Row, TicketComment, TicketEvent, Value } from './workspace.types';

@Injectable({ providedIn: 'root' })
export class WorkspaceService {
  private readonly http = inject(HttpClient);
  private readonly session = inject(Session);

  list(resource: Resource, query: Record<string, string | number>) {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== '') params = params.set(key, value);
    }
    return this.http.get<ApiResponse<Row[]>>('/api/v1/' + resource, { params });
  }

  listAll(resource: Resource) {
    if (resource === 'users' && !this.session.allows('ADMIN')) {
      return this.http
        .get<ApiResponse<Row[]>>('/api/v1/directory')
        .pipe(map((response) => response.data));
    }
    const load = (page: number) => this.list(resource, { page, pageSize: 100 });
    return load(1).pipe(
      expand((response) =>
        response.meta && response.meta.page < response.meta.totalPages
          ? load(response.meta.page + 1)
          : EMPTY,
      ),
      map((response) => response.data),
      reduce((rows, page) => [...rows, ...page], [] as Row[]),
    );
  }

  specialties(id: number) {
    return this.http.get<ApiResponse<number[]>>('/api/v1/users/' + id + '/categories');
  }

  saveSpecialties(id: number, categoryIds: number[]) {
    return this.http.put<ApiResponse<number[]>>('/api/v1/users/' + id + '/categories', {
      categoryIds,
    });
  }

  comments(id: number) {
    return this.http.get<ApiResponse<TicketComment[]>>('/api/v1/tickets/' + id + '/comments');
  }

  addComment(id: number, body: string) {
    return this.http.post<ApiResponse<TicketComment>>('/api/v1/tickets/' + id + '/comments', {
      body,
    });
  }

  archiveTickets(ids: number[]) {
    return this.http.post<ApiResponse<{ count: number }>>('/api/v1/tickets/archive', { ids });
  }

  find(resource: Resource, id: string) {
    return this.http.get<
      ApiResponse<Row & { attachments?: Attachment[]; history?: TicketEvent[] }>
    >('/api/v1/' + resource + '/' + encodeURIComponent(id));
  }

  save(
    resource: Resource,
    id: number | null,
    input: Record<string, Value>,
    files: File[] = [],
    removed: string[] = [],
  ) {
    let body: Record<string, Value> | FormData = input;
    if (files.length || removed.length) {
      const form = new FormData();
      form.append(
        'ticket',
        JSON.stringify(removed.length ? { ...input, removeAttachments: removed } : input),
      );
      for (const file of files) form.append('attachments', file);
      body = form;
    }
    const url = '/api/v1/' + resource;
    return id === null
      ? this.http.post<ApiResponse<Row>>(url, body)
      : this.http.patch<ApiResponse<Row>>(url + '/' + id, body);
  }
}
