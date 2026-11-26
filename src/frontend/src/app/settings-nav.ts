import { Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Translate } from './i18n';
import { Session } from './session';

@Component({
  selector: 'app-settings-nav',
  imports: [RouterLink, Translate],
  template: `
    <nav class="panel settings-nav" [attr.aria-label]="'settings' | t">
      <a routerLink="/settings" [attr.aria-current]="active() === 'general' ? 'page' : null">
        <i class="bi bi-sliders" aria-hidden="true"></i>{{ 'general_settings' | t }}
      </a>
      @if (session.allows('OWNER')) {
        <a
          routerLink="/settings"
          [queryParams]="{ section: 'numbering' }"
          [attr.aria-current]="active() === 'numbering' ? 'page' : null"
        >
          <i class="bi bi-hash" aria-hidden="true"></i>{{ 'ticket_number_rules' | t }}
        </a>
      }
      @if (session.hasRole('ADMIN')) {
        <a
          routerLink="/settings/organizations"
          [attr.aria-current]="active() === 'organization' ? 'page' : null"
        >
          <i class="bi bi-diagram-3" aria-hidden="true"></i>{{ 'organization' | t }}
        </a>
      }
    </nav>
  `,
})
export class SettingsNav {
  readonly active = input.required<'general' | 'numbering' | 'organization'>();
  readonly session = inject(Session);
}
