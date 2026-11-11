import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { computed, effect, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';

export type ThemePreference = 'system' | 'light' | 'dark';
export type AppliedTheme = Exclude<ThemePreference, 'system'>;

const THEME_STORAGE_KEY = 'hisaab-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly mediaQuery =
    this.isBrowser && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-color-scheme: dark)')
      : null;

  readonly storageWarning = signal('');
  readonly preference = signal<ThemePreference>(this.readPreference());
  private readonly systemPrefersDark = signal(this.mediaQuery?.matches ?? false);
  readonly appliedTheme = computed<AppliedTheme>(() => {
    const preference = this.preference();
    return preference === 'system' ? (this.systemPrefersDark() ? 'dark' : 'light') : preference;
  });

  constructor() {
    this.mediaQuery?.addEventListener('change', this.onSystemThemeChange);
    effect(() => {
      this.document.documentElement.dataset['theme'] = this.appliedTheme();
    });
  }

  cyclePreference(): void {
    const nextPreference: ThemePreference =
      this.preference() === 'system' ? 'light' : this.preference() === 'light' ? 'dark' : 'system';
    this.preference.set(nextPreference);
    this.persistPreference(nextPreference);
  }

  private readonly onSystemThemeChange = (event: MediaQueryListEvent): void => {
    this.systemPrefersDark.set(event.matches);
  };

  private readPreference(): ThemePreference {
    if (!this.isBrowser) {
      return 'system';
    }

    try {
      const savedPreference = localStorage.getItem(THEME_STORAGE_KEY);
      return savedPreference === 'light' || savedPreference === 'dark' ? savedPreference : 'system';
    } catch (error) {
      this.reportStorageFailure('Could not read the saved theme preference.', error);
      return 'system';
    }
  }

  private persistPreference(preference: ThemePreference): void {
    if (!this.isBrowser) {
      return;
    }

    try {
      if (preference === 'system') {
        localStorage.removeItem(THEME_STORAGE_KEY);
      } else {
        localStorage.setItem(THEME_STORAGE_KEY, preference);
      }
      this.storageWarning.set('');
    } catch (error) {
      this.reportStorageFailure('Could not save the theme preference.', error);
    }
  }

  private reportStorageFailure(message: string, error: unknown): void {
    console.error(message, error);
    this.storageWarning.set(`${message} Your current theme will remain active for this visit.`);
  }
}
