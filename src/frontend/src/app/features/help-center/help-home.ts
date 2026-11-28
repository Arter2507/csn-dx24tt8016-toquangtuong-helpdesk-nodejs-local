import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { Translate } from '../../core/i18n/i18n';
import { Session } from '../../core/auth/session';
import { Article, KnowledgeService } from '../knowledge/knowledge.service';
import { ticketReference, ticketStatuses } from '../../shared/data/workspace-labels';
import { WorkspaceService } from '../../shared/data/workspace.service';
import { Row } from '../../shared/data/workspace.types';
import { Preferences } from '../../core/preferences/preferences';
import { Loading } from '../../shared/ui/loading';
import { HelpArticles } from './help-articles';

@Component({
  imports: [RouterLink, Translate, Loading, HelpArticles],
  templateUrl: './help-home.html',
})
export class HelpHome implements OnInit {
  private readonly router = inject(Router);
  private readonly knowledge = inject(KnowledgeService);
  private readonly workspace = inject(WorkspaceService);
  private readonly preferences = inject(Preferences);
  private readonly destroy = inject(DestroyRef);
  readonly session = inject(Session);
  readonly articles = signal<Article[] | null>(null);
  readonly tickets = signal<Row[] | null>(null);
  readonly knowledgeFailed = signal(false);
  readonly ticketsFailed = signal(false);
  readonly ticketReference = ticketReference;
  readonly status = (value: unknown) => ticketStatuses.find((entry) => entry.value === value);

  ngOnInit() {
    this.loadArticles();
    void this.session
      .initialize()
      .then(() => {
        if (
          !this.destroy.destroyed &&
          (this.session.account()?.organizationId || this.session.mode() === 'demo')
        )
          this.loadTickets();
      })
      .catch(() => undefined);
  }

  search(value: string) {
    void this.router.navigate(['/help-center/knowledge'], {
      queryParams: { q: value.trim() || null },
    });
  }

  loadArticles() {
    this.knowledgeFailed.set(false);
    this.knowledge
      .list('', { publicOnly: true, limit: 4 })
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: ({ data }) => this.articles.set(data),
        error: () => this.knowledgeFailed.set(true),
      });
  }

  loadTickets() {
    this.ticketsFailed.set(false);
    this.workspace
      .list('tickets', {
        requesterId: this.session.account()?.id ?? this.preferences.account(),
        page: 1,
        pageSize: 5,
        sortBy: 'id',
        sortOrder: 'desc',
      })
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: ({ data }) => this.tickets.set(data),
        error: () => this.ticketsFailed.set(true),
      });
  }
}
