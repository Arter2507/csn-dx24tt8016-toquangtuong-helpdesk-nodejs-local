import { Component, DestroyRef, inject, input, OnInit, signal } from '@angular/core';
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
import { ThemeSettings } from './theme-settings';

@Component({
  imports: [FormsModule, RouterLink, Translate, TicketNumberSettings, SettingsNav, ThemeSettings],
  templateUrl: './settings-page.html',
})
export class SettingsPage implements OnInit {
  readonly personal = input(false);
  private readonly route = inject(ActivatedRoute);
  private readonly workspace = inject(WorkspaceService);
  private readonly destroy = inject(DestroyRef);
  readonly i18n = inject(I18n);
  readonly preferences = inject(Preferences);
  readonly session = inject(Session);
  readonly users = signal<Row[] | null>(null);
  readonly error = signal('');
  readonly settingsTab = signal<'general' | 'numbering' | 'theme'>('general');

  get base() {
    return this.personal() ? '/help-center' : '/admin-management';
  }

  ngOnInit() {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroy)).subscribe((params) => {
      const section = params.get('section');
      this.settingsTab.set(
        section === 'theme' ||
          (section === 'numbering' && !this.personal() && this.session.allows('OWNER'))
          ? section
          : 'general',
      );
    });
    void this.session
      .initialize()
      .then(() => {
        if (!this.destroy.destroyed && this.session.mode() === 'demo') this.load();
      })
      .catch(() => undefined);
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
