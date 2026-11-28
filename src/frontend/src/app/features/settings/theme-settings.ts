import { Component, inject } from '@angular/core';
import { Translate } from '../../core/i18n/i18n';
import { palettes, skies, skyUrl } from '../../core/preferences/palettes';
import { Preferences } from '../../core/preferences/preferences';

@Component({
  selector: 'app-theme-settings',
  imports: [Translate],
  template: `
    <section class="panel theme-settings">
      <h2>{{ 'theme_settings' | t }}</h2>
      <p class="muted">{{ 'theme_settings_intro' | t }}</p>
      <div class="portal-choices" role="group" [attr.aria-label]="'color_theme' | t">
        @for (mode of modes; track mode) {
          <button
            class="secondary"
            type="button"
            [attr.aria-pressed]="preferences.appearance() === mode"
            (click)="preferences.appearance.set(mode)"
          >
            {{ mode + '_theme' | t }}
          </button>
        }
      </div>
      <div class="theme-options" role="group" [attr.aria-label]="'theme_settings' | t">
        <button
          type="button"
          [attr.aria-pressed]="preferences.palette() === 'none'"
          (click)="preferences.palette.set('none')"
        >
          <i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i>{{ 'theme_none' | t }}
        </button>
        @for (palette of palettes; track palette) {
          <button
            type="button"
            [attr.aria-pressed]="preferences.palette() === palette"
            (click)="preferences.palette.set(palette)"
          >
            <span class="theme-swatch" [attr.data-swatch]="palette" aria-hidden="true"></span
            >{{ 'theme_' + palette | t }}
          </button>
        }
        <button
          type="button"
          [attr.aria-pressed]="preferences.palette() === 'glass'"
          (click)="preferences.palette.set('glass')"
        >
          <i class="bi bi-cloud" aria-hidden="true"></i>{{ 'theme_glass' | t }}
        </button>
      </div>
      @if (preferences.palette() === 'glass') {
        @for (theme of skyModes; track theme) {
          <h3>{{ theme + '_theme' | t }}</h3>
          <div
            class="theme-options sky-options"
            role="group"
            [attr.aria-label]="theme + '_theme' | t"
          >
            @for (image of skies[theme]; track image) {
              <button
                type="button"
                [attr.aria-pressed]="preferences.sky[theme]() === image"
                (click)="preferences.sky[theme].set(image)"
              >
                <span class="sky-preview"
                  ><img [src]="skyUrl(theme, image)" alt="" loading="lazy"
                /></span>
                {{ 'theme_sky_option' | t: { number: image } }}
              </button>
            }
          </div>
        }
      }
    </section>
  `,
})
export class ThemeSettings {
  readonly preferences = inject(Preferences);
  readonly palettes = palettes;
  readonly skies = skies;
  readonly skyUrl = skyUrl;
  readonly modes = ['light', 'dark', 'system'] as const;
  readonly skyModes = ['light', 'dark'] as const;
}
