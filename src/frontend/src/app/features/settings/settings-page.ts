import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { I18n, Translate, errorKey } from '../../core/i18n/i18n';
import { Session } from '../../core/auth/session';
import { Preferences } from '../../core/preferences/preferences';
import { WorkspaceService } from '../../shared/data/workspace.service';
import { Row } from '../../shared/data/workspace.types';
import { TicketNumberSettings } from './ticket-number-settings';
import { SettingsNav } from './settings-nav';

@Component({
  imports: [FormsModule, RouterLink, Translate, TicketNumberSettings, SettingsNav],
  templateUrl: './settings-page.html',
})
export class SettingsPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly workspace = inject(WorkspaceService);
  private readonly destroy = inject(DestroyRef);
  readonly i18n = inject(I18n);
  readonly preferences = inject(Preferences);
  readonly session = inject(Session);
  readonly users = signal<Row[] | null>(null);
  readonly error = signal('');
  readonly settingsTab = signal<'general' | 'numbering'>('general');

  ngOnInit() {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroy)).subscribe((params) => {
      this.settingsTab.set(
        params.get('section') === 'numbering' && this.session.allows('OWNER')
          ? 'numbering'
          : 'general',
      );
    });
    if (!this.session.account()) this.load();
  }

  load() {
    this.error.set('');
    this.workspace
      .listAll('users')
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (users) => {
          const available = users.filter((user) => user['isActive']);
          this.users.set(available);
          if (available[0] && !available.some((user) => user.id === this.preferences.account())) {
            this.preferences.account.set(available[0].id);
          }
        },
        error: (error) => this.error.set(errorKey(error)),
      });
  }
}
