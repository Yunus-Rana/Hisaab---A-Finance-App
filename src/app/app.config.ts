import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { LocalRepository } from './data/local/local-repository';
import { TRACKER_REPOSITORY } from './data/repositories/tracker-repository.token';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    { provide: TRACKER_REPOSITORY, useFactory: () => new LocalRepository() },
  ],
};
