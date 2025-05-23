import { Plugin } from 'vite';
/**
 * This plugin is a workaround for the ɵPendingTasks symbol being renamed
 * to ɵPendingTasksInternal in Angular v19.0.4. The symbol is renamed to support previous versions of
 * Angular with Analog that used the ɵPendingTasks symbol.
 *
 * Commmit: https://github.com/angular/angular/commit/24e317cb157bf1ef159ed8554f1b79cb3443edf4
 */
export declare function pendingTasksPlugin(): Plugin;
