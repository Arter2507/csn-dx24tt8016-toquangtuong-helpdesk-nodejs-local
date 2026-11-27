import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Translate } from '../../core/i18n/i18n';

@Component({
  imports: [RouterLink, Translate],
  templateUrl: './directory-page.html',
})
export class DirectoryPage {
  readonly entries = [
    {
      path: '/users',
      icon: 'bi-people',
      label: 'directory_users',
      description: 'directory_users_description',
    },
    {
      path: '/categories/ticket-types',
      icon: 'bi-tags',
      label: 'ticket_types',
      description: 'manage_request_categories_and_their_availability',
    },
  ];
}
