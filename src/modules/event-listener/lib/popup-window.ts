import {Subscription} from 'rxjs';
import {filter} from 'rxjs/operators';
import {ElementRef} from '@angular/core';
import {GlobalClickEventListener} from './global-click-event-listener';
import {cleanSubscriptionToUnsub} from '../../../lib/rxjs/helpers';

export class PopupWindow {

  protected _isExpand = false;
  protected targetElement: ElementRef<Element>;
  protected subscription: Subscription;

  constructor(
    readonly listener: GlobalClickEventListener,
  ) {
  }

  switch() {
    this.isExpand ? this.collapse() : this.expand();
  }

  expand(event?: MouseEvent) {
    if (event instanceof MouseEvent) {
      event.stopPropagation();
    }
    this._isExpand = true;
  }

  collapse(event?: MouseEvent) {
    if (event instanceof MouseEvent) {
      event.stopPropagation();
    }

    this._isExpand = false;
  }

  get isExpand(): boolean {
    return this._isExpand;
  }

  /**
   * 訂閱 global listener 的觸發事件，並傳入欲跳脫的 DOM 元素，當事件觸發時，若觸發來源自跳脫的 DOM，則阻止關閉 window
   **/
  protected subscribeClick(element: ElementRef<Element>) {
    this.targetElement = element;
    cleanSubscriptionToUnsub([this.subscription]);
    this.subscription = this.listener.getObservable()
      .pipe(filter(this.isNeedToCollapseFn()))
      .subscribe(() => this.collapse());
  }

  protected isNeedToCollapseFn() {
    return (event: MouseEvent) => {
      console.log('isNeedToCollapseFn');
      const node = event.target as Node | Element;
      return event instanceof MouseEvent &&
        this._isExpand &&
        this.targetElement &&
        !this.targetElement.nativeElement.contains(node);
    };
  }
}
