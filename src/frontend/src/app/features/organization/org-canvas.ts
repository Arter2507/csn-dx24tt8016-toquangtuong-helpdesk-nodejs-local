import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Translate } from '../../core/i18n/i18n';

@Component({
  selector: 'app-org-canvas',
  imports: [Translate],
  template: `
    <div class="org-canvas-tools" role="group" [attr.aria-label]="'hierarchy_graph' | t">
      <button
        type="button"
        class="secondary"
        (click)="zoom(1 / 1.2)"
        [attr.aria-label]="'canvas_zoom_out' | t"
      >
        −
      </button>
      <output>{{ percent() }}%</output>
      <button
        type="button"
        class="secondary"
        (click)="zoom(1.2)"
        [attr.aria-label]="'canvas_zoom_in' | t"
      >
        +
      </button>
      <button type="button" class="text-button" (click)="fit()">{{ 'canvas_fit' | t }}</button>
    </div>
    <div
      #viewport
      class="org-chart-scroll org-canvas"
      [class.dragging]="dragging()"
      tabindex="0"
      role="region"
      [attr.aria-label]="'hierarchy_graph' | t"
      (wheel)="onWheel($event)"
      (pointerdown)="start($event)"
      (pointermove)="drag($event)"
      (pointerup)="stop()"
      (pointercancel)="stop()"
      (lostpointercapture)="stop()"
      (keydown)="onKey($event)"
    >
      <div #stage class="org-canvas-stage" [style.transform]="transform()"><ng-content /></div>
    </div>
  `,
})
export class OrgCanvas implements AfterViewInit {
  private readonly viewport = viewChild.required<ElementRef<HTMLElement>>('viewport');
  private readonly stage = viewChild.required<ElementRef<HTMLElement>>('stage');
  private readonly destroy = inject(DestroyRef);
  readonly percent = signal(100);
  readonly dragging = signal(false);
  readonly transform = signal('');
  private scale = 1;
  private x = 0;
  private y = 0;
  private anchor: { id: number; x: number; y: number; left: number; top: number } | null = null;

  ngAfterViewInit() {
    const frame = requestAnimationFrame(() => this.fit());
    this.destroy.onDestroy(() => cancelAnimationFrame(frame));
  }

  private render() {
    this.percent.set(Math.round(this.scale * 100));
    this.transform.set('translate(' + this.x + 'px,' + this.y + 'px) scale(' + this.scale + ')');
  }

  fit() {
    const viewport = this.viewport().nativeElement;
    const stage = this.stage().nativeElement;
    this.scale = Math.min(
      1,
      (viewport.clientWidth - 32) / stage.offsetWidth,
      (viewport.clientHeight - 32) / stage.offsetHeight,
    );
    this.x = (viewport.clientWidth - stage.offsetWidth * this.scale) / 2;
    this.y = Math.max(16, (viewport.clientHeight - stage.offsetHeight * this.scale) / 2);
    this.render();
  }

  zoom(multiplier: number, at?: { x: number; y: number }) {
    const viewport = this.viewport().nativeElement;
    const point = at ?? { x: viewport.clientWidth / 2, y: viewport.clientHeight / 2 };
    const scale = Math.min(3, Math.max(Math.min(this.scale, 0.18), this.scale * multiplier));
    const change = scale / this.scale;
    this.x = point.x - (point.x - this.x) * change;
    this.y = point.y - (point.y - this.y) * change;
    this.scale = scale;
    this.render();
  }

  onWheel(event: WheelEvent) {
    event.preventDefault();
    const bounds = this.viewport().nativeElement.getBoundingClientRect();
    this.zoom(event.deltaY > 0 ? 0.9 : 1 / 0.9, {
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    });
  }

  start(event: PointerEvent) {
    if (!event.isPrimary || event.button !== 0 || (event.target as Element).closest('button,a'))
      return;
    this.viewport().nativeElement.setPointerCapture(event.pointerId);
    this.anchor = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      left: this.x,
      top: this.y,
    };
    this.dragging.set(true);
  }

  drag(event: PointerEvent) {
    const anchor = this.anchor;
    if (!anchor || anchor.id !== event.pointerId) return;
    this.x = anchor.left + event.clientX - anchor.x;
    this.y = anchor.top + event.clientY - anchor.y;
    this.render();
  }

  stop() {
    this.anchor = null;
    this.dragging.set(false);
  }

  onKey(event: KeyboardEvent) {
    if (event.target !== this.viewport().nativeElement) return;
    const offsets: Record<string, [number, number]> = {
      ArrowLeft: [40, 0],
      ArrowRight: [-40, 0],
      ArrowUp: [0, 40],
      ArrowDown: [0, -40],
    };
    const offset = offsets[event.key];
    if (!offset) return;
    event.preventDefault();
    this.x += offset[0];
    this.y += offset[1];
    this.render();
  }
}
