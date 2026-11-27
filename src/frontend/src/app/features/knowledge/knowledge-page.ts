import { Component, DestroyRef, inject, input, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  firstValueFrom,
  finalize,
  Subject,
  debounceTime,
  switchMap,
  catchError,
  EMPTY,
} from 'rxjs';
import { Session } from '../../core/auth/session';
import { Translate, errorKey } from '../../core/i18n/i18n';
import { Article, ArticleForm, KnowledgeService } from './knowledge.service';
import { Loading } from '../../shared/ui/loading';

@Component({
  imports: [FormsModule, RouterLink, Translate, Loading],
  templateUrl: './knowledge-page.html',
})
export class KnowledgePage implements OnInit {
  readonly id = input<string>();
  readonly session = inject(Session);
  private readonly service = inject(KnowledgeService);
  private readonly router = inject(Router);
  private readonly destroy = inject(DestroyRef);
  private readonly filters = new Subject<number | null>();
  readonly rows = signal<Article[]>([]);
  readonly categories = signal<{ id: number; name: string }[]>([]);
  readonly current = signal<Article | null>(null);
  readonly loading = signal(true);
  readonly more = signal(false);
  readonly error = signal('');
  readonly form = signal<ArticleForm | null>(null);
  readonly saving = signal(false);
  query = '';
  categoryId: number | null = null;

  async ngOnInit() {
    await this.session.initialize().catch(() => undefined);
    if (this.destroy.destroyed) return;
    this.service
      .categories()
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: ({ data }) => this.categories.set(data),
        error: () => {},
      });
    const id = this.id();
    if (id) {
      this.service
        .find(id)
        .pipe(
          takeUntilDestroyed(this.destroy),
          finalize(() => this.loading.set(false)),
        )
        .subscribe({
          next: ({ data }) => this.current.set(data),
          error: (error) => this.error.set(errorKey(error)),
        });
      return;
    }
    this.filters
      .pipe(
        debounceTime(180),
        switchMap((before) => {
          if (before === null) this.rows.set([]);
          this.loading.set(true);
          this.error.set('');
          return this.service.list(this.query, { categoryId: this.categoryId, before }).pipe(
            catchError((error) => {
              this.error.set(errorKey(error));
              return EMPTY;
            }),
            finalize(() => this.loading.set(false)),
          );
        }),
        takeUntilDestroyed(this.destroy),
      )
      .subscribe(({ data }) => {
        this.rows.update((rows) => [...rows, ...data]);
        this.more.set(data.length === 20);
      });
    this.filter();
  }

  filter() {
    this.rows.set([]);
    this.more.set(false);
    this.filters.next(null);
  }

  next() {
    this.filters.next(this.rows().at(-1)?.id ?? null);
  }

  edit(article?: Article) {
    this.error.set('');
    this.form.set(
      article
        ? {
            title: article.title,
            categoryId: article.categoryId,
            visibility: article.visibility,
            body: article.body ?? '',
          }
        : { title: '', body: '', categoryId: null, visibility: 'INTERNAL' },
    );
  }

  async save(form: ArticleForm) {
    if (this.saving() || !form.categoryId) return;
    this.saving.set(true);
    this.error.set('');
    try {
      const { data } = await firstValueFrom(this.service.save(form, this.current()?.id));
      this.form.set(null);
      if (this.current())
        this.current.set((await firstValueFrom(this.service.find(String(data.id)))).data);
      else await this.router.navigate(['/knowledge', data.id]);
    } catch (error) {
      this.error.set(errorKey(error));
    } finally {
      this.saving.set(false);
    }
  }

  async remove(id: number) {
    this.saving.set(true);
    this.error.set('');
    try {
      await firstValueFrom(this.service.archive(id));
      await this.router.navigate(['/knowledge']);
    } catch (error) {
      this.error.set(errorKey(error));
    } finally {
      this.saving.set(false);
    }
  }
}
