import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
  viewChild,
  ElementRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { Translate, I18n, errorKey } from '../../core/i18n/i18n';
import { ApiResponse } from '../../core/http/api-response';
import { calendarDay, calendarMonth } from '../../shared/date/calendar-date';

type Status = 'TODO' | 'DOING' | 'DONE';
type View = 'board' | 'calendar' | 'table';
interface TaskData {
  title: string;
  description: string;
  status: Status;
  assigneeId: number | null;
  dueDate: string | null;
}
export interface Task extends TaskData {
  id: number;
  version: number;
  canEdit: boolean;
}
interface Member {
  id: number;
  fullName: string;
}
const url = '/api/v1/tasks';
const empty = (): TaskData => ({
  title: '',
  description: '',
  status: 'TODO',
  assigneeId: null,
  dueDate: null,
});
@Component({ imports: [DatePipe, FormsModule, Translate], templateUrl: './tasks.html' })
export class TasksPage {
  private readonly http = inject(HttpClient);
  private readonly destroy = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly editor = viewChild<ElementRef<HTMLDialogElement>>('editor');
  readonly i18n = inject(I18n);
  readonly tasks = signal<Task[]>([]);
  readonly members = signal<Member[]>([]);
  readonly loading = signal(true);
  readonly pending = signal(false);
  readonly error = signal('');
  readonly editError = signal('');
  readonly view = signal<View>(
    this.route.snapshot.queryParamMap.get('view') === 'calendar' ? 'calendar' : 'board',
  );
  readonly views: View[] = ['board', 'calendar', 'table'];
  readonly states: Status[] = ['TODO', 'DOING', 'DONE'];
  readonly columns = computed(() =>
    this.states.map((status) => ({
      status,
      tasks: this.tasks().filter((task) => task.status === status),
    })),
  );
  readonly today = calendarDay.format(new Date());
  readonly month = signal(calendarMonth(this.today));
  readonly weekDays = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  readonly calendar = computed(() => {
    const month = this.month();
    const first = (month.getUTCDay() + 6) % 7;
    const days = new Date(
      Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0),
    ).getUTCDate();
    return Array.from({ length: Math.ceil((first + days) / 7) * 7 }, (_, index) => {
      const offset = index - first + 1;
      const date = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), offset, 12));
      const key = calendarDay.format(date);
      return {
        date,
        key,
        inMonth: offset >= 1 && offset <= days,
        tasks: this.tasks().filter((task) => task.dueDate === key),
      };
    });
  });
  readonly over = signal<Status | null>(null);
  readonly editing = signal<Task | null>(null);
  private linkedTask = Number(this.route.snapshot.queryParamMap.get('task'));
  draft = empty();

  constructor() {
    this.load();
  }

  load() {
    this.http
      .get<ApiResponse<{ tasks: Task[]; members: Member[] }>>(url)
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: ({ data }) => {
          this.tasks.set(data.tasks);
          this.members.set(data.members);
          if (this.linkedTask) {
            const linked = data.tasks.find((task) => task.id === this.linkedTask);
            this.linkedTask = 0;
            if (linked) {
              if (linked.dueDate) this.month.set(calendarMonth(linked.dueDate));
              this.open(linked);
            } else {
              this.error.set('task_not_found');
              this.clearTaskLink();
            }
          }
        },
        error: (error) => this.error.set(errorKey(error)),
      });
  }

  memberName(id: number | null) {
    return (
      this.members().find((member) => member.id === id)?.fullName ??
      (id ? '#' + id : this.i18n.text('unassigned'))
    );
  }

  open(task: Task | null = null, dueDate: string | null = null) {
    this.editing.set(task);
    this.draft = task
      ? {
          title: task.title,
          description: task.description,
          status: task.status,
          assigneeId: task.assigneeId,
          dueDate: task.dueDate,
        }
      : { ...empty(), dueDate };
    this.editError.set('');
    this.editor()?.nativeElement.showModal();
  }

  close() {
    this.editor()?.nativeElement.close();
  }

  clearTaskLink() {
    if (!this.route.snapshot.queryParamMap.has('task')) return;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { task: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  moveMonth(offset: number) {
    this.month.update(
      (month) => new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + offset, 1, 12)),
    );
  }

  goToToday() {
    this.month.set(calendarMonth(this.today));
  }

  startDrag(event: DragEvent, task: Task) {
    if (!task.canEdit || !event.dataTransfer) return;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('application/x-tram-meo-task', String(task.id));
  }

  dragOver(event: DragEvent, status: Status) {
    if (!event.dataTransfer?.types.includes('application/x-tram-meo-task')) return;
    event.preventDefault();
    this.over.set(status);
  }

  drop(event: DragEvent, status: Status) {
    event.preventDefault();
    this.over.set(null);
    const id = Number(event.dataTransfer?.getData('application/x-tram-meo-task'));
    const task = this.tasks().find((item) => item.id === id);
    if (task?.canEdit && task.status !== status) this.updateStatus(task, status);
  }

  toggleDone(event: Event, task: Task) {
    const checkbox = event.target as HTMLInputElement;
    this.updateStatus(task, checkbox.checked ? 'DONE' : 'TODO', checkbox);
  }

  updateStatus(task: Task, status: Status, checkbox?: HTMLInputElement) {
    if (!task.canEdit || this.pending() || status === task.status) return;
    this.persist(task, { status }, false, checkbox);
  }

  save() {
    const task = this.editing();
    if (this.pending() || (task && !task.canEdit) || !this.draft.title.trim()) return;
    this.persist(task, { ...this.draft, dueDate: this.draft.dueDate || null }, true);
  }

  private persist(
    task: Task | null,
    changes: Partial<TaskData>,
    dialog: boolean,
    checkbox?: HTMLInputElement,
  ) {
    this.pending.set(true);
    const errorMessage = dialog ? this.editError : this.error;
    errorMessage.set('');
    const request = task
      ? this.http.patch<ApiResponse<Task>>(url + '/' + task.id, {
          ...changes,
          version: task.version,
        })
      : this.http.post<ApiResponse<Task>>(url, changes);
    request
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => this.pending.set(false)),
      )
      .subscribe({
        next: ({ data }) => {
          this.tasks.update((rows) =>
            task ? rows.map((row) => (row.id === data.id ? data : row)) : [data, ...rows],
          );
          if (dialog) this.close();
        },
        error: (error) => {
          if (checkbox) checkbox.checked = task?.status === 'DONE';
          errorMessage.set(errorKey(error));
          if (error.status === 409) this.load();
        },
      });
  }
}
