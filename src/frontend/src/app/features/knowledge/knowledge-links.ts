import { Component, inject, input, output, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Translate } from '../../core/i18n/i18n';
import { ApiResponse } from '../../core/http/api-response';
import { Article } from './knowledge.service';
import { HttpContext } from '@angular/common/http';
import { silentRequest } from '../../core/http/network-progress';

@Component({
  selector: 'app-knowledge-links',
  imports: [FormsModule, RouterLink, Translate],
  template: `
    @if (mode() === 'picker') {
      <label class="field"
        >{{ 'knowledge_search' | t }}
        <input
          type="search"
          [ngModel]="query()"
          (ngModelChange)="query.set($event)"
          maxlength="200"
        />
      </label>
    }
    @if (results.hasValue() && results.value().data.length) {
      <section class="knowledge-links">
        @if (mode() === 'suggestions') {
          <h3>{{ 'knowledge_suggestions' | t }}</h3>
        }
        <ul>
          @for (article of results.value().data; track article.id) {
            <li>
              @if (mode() === 'picker') {
                <button class="text-button" type="button" (click)="chosen.emit(article)">
                  {{ article.title }}
                </button>
              } @else {
                <a [routerLink]="['/knowledge', article.id]" target="_blank" rel="noopener">{{
                  article.title
                }}</a>
              }
              @if (article.visibility === 'INTERNAL') {
                <small class="muted">{{ 'knowledge_internal' | t }}</small>
              }
            </li>
          }
        </ul>
      </section>
    } @else if (mode() === 'picker') {
      <p role="status">
        {{
          (results.isLoading()
            ? 'loading'
            : results.error()
              ? 'we_couldnt_load_your_data'
              : 'no_matching_results'
          ) | t
        }}
      </p>
    }
  `,
})
export class KnowledgeLinks {
  readonly mode = input.required<'suggestions' | 'picker'>();
  readonly title = input('');
  readonly publicOnly = input(true);
  readonly chosen = output<Article>();
  readonly query = signal('');
  readonly results = httpResource<ApiResponse<Article[]>>(() => {
    const suggestions = this.mode() === 'suggestions';
    const term = (suggestions ? this.title() : this.query()).trim().slice(0, 200);
    if (suggestions && term.length < 3) return undefined;
    return {
      url: '/api/v1/knowledge',
      params: { q: term, limit: 5, ...(this.publicOnly() ? { publicOnly: 'true' } : {}) },
      context: new HttpContext().set(silentRequest, true),
    };
  });
}
