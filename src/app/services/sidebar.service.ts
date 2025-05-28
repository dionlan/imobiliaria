import { Injectable } from '@angular/core';
import { BehaviorSubject, distinctUntilChanged } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SidebarService {
    private visibleSubject = new BehaviorSubject<boolean>(true);
    visible$ = this.visibleSubject.asObservable().pipe(distinctUntilChanged());

    get visible(): boolean {
        return this.visibleSubject.value;
    }

    toggle(): void {
        this.visibleSubject.next(!this.visible);
    }

    show(): void {
        this.visibleSubject.next(true);
    }

    hide(): void {
        this.visibleSubject.next(false);
    }
}