import { DatePipe } from '@angular/common';
import { Component, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Translate } from '../../core/i18n/i18n';
import { notificationLabel, Notifications } from './notifications';
import { Preferences } from '../../core/preferences/preferences';

@Component({
  selector: 'app-notification-bell',
  imports: [DatePipe, RouterLink, Translate],
  templateUrl: './notification-bell.html',
})
export class NotificationBell {
  readonly inbox = inject(Notifications);
  private readonly preferences = inject(Preferences);
  readonly open = signal(false);
  readonly label = notificationLabel;

  constructor() {
    effect(() => {
      if (!this.preferences.notificationToasts()) this.inbox.clearToasts();
    });
  }

  updateOpen(event: Event) {
    const opened = (event as ToggleEvent).newState === 'open';
    this.open.set(opened);
    if (opened) this.inbox.refresh();
  }
}
