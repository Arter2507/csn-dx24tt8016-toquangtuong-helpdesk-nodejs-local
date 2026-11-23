import { HttpClient, HttpParams } from '@angular/common/http';
import { Component, DestroyRef, ElementRef, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs';
import { ApiResponse } from './features/categories/interfaces/category';
import { userRoles } from './features/workspace/workspace-labels';
import { errorKey, Translate } from './i18n';
import { Preferences } from './preferences';
import { Account, Session } from './session';

type Tab = 'details' | 'roles' | 'security';
type Details = {
  department: string;
  jobTitle: string;
  location: string;
  birthDate: string;
  bio: string;
};
interface Profile extends Account {
  phone: string;
  details: Partial<Details>;
  avatarMime: string | null;
}
const url = '/api/v1/profile';

@Component({
  imports: [FormsModule, Translate],
  templateUrl: './profile.html',
})
export class ProfilePage {
  private readonly http = inject(HttpClient);
  private readonly destroy = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly preferences = inject(Preferences);
  readonly session = inject(Session);
  readonly avatarDialog = viewChild<ElementRef<HTMLDialogElement>>('avatarDialog');
  readonly tabs: Tab[] = ['details', 'roles', 'security'];
  readonly tab = signal<Tab>('details');
  readonly profile = signal<Profile | null>(null);
  readonly pending = signal(false);
  readonly error = signal('');
  readonly feedback = signal('');
  readonly imageRevision = signal(0);
  readonly draft = {
    fullName: '',
    phone: '',
    department: '',
    jobTitle: '',
    location: '',
    birthDate: '',
    bio: '',
  };
  currentPassword = '';
  nextPassword = '';

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroy)).subscribe(() => this.load());
  }

  private get params() {
    const id =
      Number(this.route.snapshot.queryParamMap.get('account')) || this.preferences.account();
    return this.session.mode() === 'demo' ? new HttpParams().set('account', id) : new HttpParams();
  }

  private apply(profile: Profile) {
    this.profile.set(profile);
    Object.assign(this.draft, {
      fullName: profile.fullName,
      phone: profile.phone,
      department: '',
      jobTitle: '',
      location: '',
      birthDate: '',
      bio: '',
      ...profile.details,
    });
  }

  load() {
    this.error.set('');
    this.http
      .get<ApiResponse<Profile>>(url, { params: this.params })
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: ({ data }) => this.apply(data),
        error: (error) => this.error.set(errorKey(error)),
      });
  }

  closeAvatar() {
    this.avatarDialog()?.nativeElement.close();
  }

  viewAvatar() {
    this.avatarDialog()?.nativeElement.showModal();
  }

  roleLabel(role: string) {
    return userRoles.find((item) => item.value === role)?.label ?? role;
  }

  avatarUrl(download = false) {
    let params = this.params.set('revision', this.imageRevision());
    if (download) params = params.set('download', '1');
    return url + '/avatar?' + params.toString();
  }

  moveTab(event: KeyboardEvent, current: Tab) {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (!step && event.key !== 'Home' && event.key !== 'End') return;
    event.preventDefault();
    const index =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? this.tabs.length - 1
          : (this.tabs.indexOf(current) + step + this.tabs.length) % this.tabs.length;
    this.tab.set(this.tabs[index]);
    document.getElementById('profile-tab-' + this.tabs[index])?.focus();
  }

  private begin() {
    if (this.pending()) return false;
    this.pending.set(true);
    this.error.set('');
    this.feedback.set('');
    return true;
  }

  save() {
    if (!this.begin()) return;
    this.http
      .patch<ApiResponse<Profile>>(url, this.draft, { params: this.params })
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => this.pending.set(false)),
      )
      .subscribe({
        next: ({ data }) => {
          this.apply(data);
          this.session.account.update((account) =>
            account ? { ...account, fullName: data.fullName } : account,
          );
          this.feedback.set('profile_saved');
        },
        error: (error) => this.error.set(errorKey(error)),
      });
  }

  upload(input: HTMLInputElement) {
    const file = input.files?.[0];
    input.value = '';
    if (!file || !this.begin()) return;
    const form = new FormData();
    form.append('avatar', file);
    this.http
      .post<void>(url + '/avatar', form, { params: this.params })
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => this.pending.set(false)),
      )
      .subscribe({
        next: () => {
          this.profile.update((profile) =>
            profile ? { ...profile, avatarMime: file.type } : profile,
          );
          this.imageRevision.update((revision) => revision + 1);
          this.feedback.set('profile_avatar_saved');
        },
        error: (error) => this.error.set(errorKey(error)),
      });
  }

  password() {
    if (!this.begin()) return;
    this.session
      .changePassword(this.currentPassword, this.nextPassword)
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => this.pending.set(false)),
      )
      .subscribe({ error: (error) => this.error.set(errorKey(error)) });
  }
}
