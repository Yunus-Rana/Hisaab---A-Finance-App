import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ThemeService } from './core/theme.service';

@Component({
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  selector: 'app-root',
  templateUrl: './app.html',
})
export class App {
  readonly theme = inject(ThemeService);
  readonly guestNoticeVisible = signal(true);
  readonly accountMessageVisible = signal(false);
  readonly sidebarOpen = signal(false);

  showAccountMessage(): void {
    this.sidebarOpen.set(false);
    this.accountMessageVisible.set(true);
  }

  closeSidebar(): void {
    this.sidebarOpen.set(false);
  }
}
