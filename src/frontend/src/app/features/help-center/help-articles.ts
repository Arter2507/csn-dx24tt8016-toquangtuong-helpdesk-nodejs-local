import { Component, DestroyRef, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Translate, errorKey } from '../../core/i18n/i18n';
import { Article, KnowledgeService } from '../knowledge/knowledge.service';

@Component({
  selector: 'app-help-articles',
  imports: [RouterLink, Translate],
  template: `
    <ul class="help-articles">
      @for (article of articles(); track article.id) {
        <li>
          <details #item (toggle)="item.open && load(article.id)">
            <summary>
              {{ article.title }} <i class="bi bi-chevron-down" aria-hidden="true"></i>
            </summary>
            <div class="help-article-answer">
              @if (answers()[article.id]; as answer) {
                @if ('body' in answer) {
                  <p class="knowledge-body">{{ answer.body }}</p>
                } @else {
                  <p role="alert">{{ answer.error | t }}</p>
                }
              } @else {
                <p role="status">{{ 'loading' | t }}</p>
              }
              <a [routerLink]="['/help-center/knowledge', article.id]">{{
                'help_open_guide' | t
              }}</a>
            </div>
          </details>
        </li>
      } @empty {
        <li class="muted">{{ 'no_matching_results' | t }}</li>
      }
    </ul>
  `,
})
export class HelpArticles {
  readonly articles = input.required<Article[]>();
  readonly answers = signal<Partial<Record<number, { body: string } | { error: string }>>>({});
  private readonly loading = new Set<number>();
  private readonly service = inject(KnowledgeService);
  private readonly destroy = inject(DestroyRef);

  load(id: number) {
    const answer = this.answers()[id];
    if ((answer && 'body' in answer) || this.loading.has(id)) return;
    this.loading.add(id);
    this.service
      .find(String(id), true)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: ({ data }) =>
          this.answers.update((answers) => ({ ...answers, [id]: { body: data.body ?? '' } })),
        error: (error) => {
          this.loading.delete(id);
          this.answers.update((answers) => ({ ...answers, [id]: { error: errorKey(error) } }));
        },
        complete: () => this.loading.delete(id),
      });
  }
}
