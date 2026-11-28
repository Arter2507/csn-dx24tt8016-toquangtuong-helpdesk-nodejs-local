import { Component, inject, input } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Translate } from '../../core/i18n/i18n';
import { Session } from '../../core/auth/session';

@Component({
  selector: 'app-settings-nav',
  imports: [RouterLink, Translate],
  template: `
    <nav class="panel settings-nav" [attr.aria-label]="'settings' | t">
      <a [routerLink]="settingsPath" [attr.aria-current]="active() === 'general' ? 'page' : null">
        <i class="bi bi-sliders" aria-hidden="true"></i>{{ 'general_settings' | t }}
      </a>
      <a
        [routerLink]="settingsPath"
        [queryParams]="{ section: 'theme' }"
        [attr.aria-current]="active() === 'theme' ? 'page' : null"
      >
        <i class="bi bi-palette" aria-hidden="true"></i>{{ 'theme_settings' | t }}
      </a>
      @if (!personal && session.allows('OWNER')) {
        <a
          [routerLink]="settingsPath"
          [queryParams]="{ section: 'numbering' }"
          [attr.aria-current]="active() === 'numbering' ? 'page' : null"
        >
          <i class="bi bi-hash" aria-hidden="true"></i>{{ 'ticket_number_rules' | t }}
        </a>
      }
      @if (!personal && session.hasRole('ADMIN')) {
        <a
          routerLink="/admin-management/settings/organizations"
          [attr.aria-current]="active() === 'organization' ? 'page' : null"
        >
          <i class="bi bi-diagram-3" aria-hidden="true"></i>{{ 'organization' | t }}
        </a>
        <a
          routerLink="/admin-management/settings/sla"
          [attr.aria-current]="active() === 'sla' ? 'page' : null"
        >
          <i class="bi bi-clock-history" aria-hidden="true"></i>{{ 'sla_settings' | t }}
        </a>
      }
    </nav>
  `,
})
export class SettingsNav {
  readonly active = input.required<'general' | 'numbering' | 'organization' | 'sla' | 'theme'>();
  readonly session = inject(Session);
  readonly personal = inject(ActivatedRoute).snapshot.data['portal'] === 'help';
  readonly settingsPath = this.personal ? '/help-center/settings' : '/admin-management/settings';
}
