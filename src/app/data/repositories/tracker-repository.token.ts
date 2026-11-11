import { InjectionToken } from '@angular/core';
import { TrackerRepository } from './tracker-repository';

export const TRACKER_REPOSITORY = new InjectionToken<TrackerRepository>('TRACKER_REPOSITORY');
