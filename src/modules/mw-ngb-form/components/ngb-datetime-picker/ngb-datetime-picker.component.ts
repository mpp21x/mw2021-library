import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import {NgbDatepicker, NgbDatepickerI18n, NgbDateStruct, NgbTimeStruct} from '@ng-bootstrap/ng-bootstrap';
import * as moment from 'moment';
import {FormControl} from '@angular/forms';
import {filter, tap} from 'rxjs/operators';
import {PopupWindow} from '../../../event-listener/lib/popup-window';
import {GlobalClickEventListener} from '../../../event-listener/lib/global-click-event-listener';
import {ValidatorsCheckDate} from '../../../form/validators/validators-check-date';
import {fillZeroWhenLessThanTen} from '../../../../lib/utils/fill-zero-when-less-than-ten';
import {UnsubscribeMap} from '../../../../lib/rxjs/unsubscribe-map';
import {MOMENT_YYYYMMDDHHMMSS} from '../../../../lib/date/common-date-format';

@Component({
  selector: 'mw-ngb-datetime-picker',
  templateUrl: './ngb-datetime-picker.component.html',
  styleUrls: ['./ngb-datetime-picker.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NgbDatetimePickerComponent extends PopupWindow implements OnInit, OnChanges, OnDestroy {

  @Input() timestamp = '';
  @Input() format: 'YYYY-MM-DD HH:mm:ss' | 'YYYY-MM-DD' = MOMENT_YYYYMMDDHHMMSS;
  @Input() borderRadius: string;
  @Input() isStart: boolean;

  @Output() datetimeChange = new EventEmitter<string | boolean>();

  ngbDate: NgbDateStruct;
  ngbTime: NgbTimeStruct;
  formControl: FormControl;
  readonly MOMENT_YYYYMMDDHHMMSS = MOMENT_YYYYMMDDHHMMSS;

  @ViewChild('tCalendar', {static: true}) tCalendar: ElementRef<HTMLDivElement>;
  @ViewChild('tNgbDatepicker', {static: true}) tNgbDatepicker: NgbDatepicker;

  private readonly _unsubscribeMap = new UnsubscribeMap();

  constructor(
    ngbDatepickerI18n: NgbDatepickerI18n,
    readonly changeDetectorRef: ChangeDetectorRef,
    readonly globalListener: GlobalClickEventListener,
  ) {
    super(globalListener);
    ngbDatepickerI18n.getMonthShortName =
      month => ['??????', '??????', '??????', '??????', '??????', '??????', '??????', '??????', '??????', '??????', '?????????', '?????????'][month - 1];
    ngbDatepickerI18n.getWeekdayLabel =
      weekday => ['???', '???', '???', '???', '???', '???', '???'][weekday - 1];
  }

  ngOnInit(): void {
    this.initFormControl();
    const formControl = this.formControl;
    this.setNgbDatetimePicker(this.formControl.value);

    this.subscribeClick(this.tCalendar);
    this._unsubscribeMap.multiSet({
      'value-change': formControl.valueChanges.pipe(
        tap((value: string) => {
          if (!moment(value, this.format, true).isValid()) {
            this.datetimeChange.emit(false);
          }
        }),
        filter((value: string) => moment(value, this.format, true).isValid()),
      ).subscribe((value) => {
        if (!formControl.valid) {
          return;
        }
        setTimeout(() => this.setNgbDatetimePicker(value), 1);
        if (value === this.timestamp) {
          return;
        }
        this.datetimeChange.emit(value);
      }),
      observable: this.subscription,
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.hasOwnProperty('timestamp') && this.timestamp) {
      this.initFormControl();
      this.formControl.setValue(this.timestamp);
    }
  }

  ngOnDestroy(): void {
    this._unsubscribeMap.unsubscribe();
  }

  pickDatetime() {
    const value = this.format === MOMENT_YYYYMMDDHHMMSS ?
      `${this.ngbDate.year}-${fillZeroWhenLessThanTen(this.ngbDate.month)}-${fillZeroWhenLessThanTen(this.ngbDate.day)} ${fillZeroWhenLessThanTen(this.ngbTime.hour)}:${fillZeroWhenLessThanTen(this.ngbTime.minute)}:${fillZeroWhenLessThanTen(this.ngbTime.second)}` :
      `${this.ngbDate.year}-${fillZeroWhenLessThanTen(this.ngbDate.month)}-${fillZeroWhenLessThanTen(this.ngbDate.day)}`;
    this.formControl.setValue(value);
    this.markForCheck();
  }

  setNgbDatetimePicker(value: string) {
    const datetime = value.split(' ');
    const date = datetime[0].split('-');

    this.ngbDate = {
      year: +date[0],
      month: +date[1],
      day: +date[2]
    };

    this.tNgbDatepicker.navigateTo(this.ngbDate);

    if (datetime.length > 1) {
      const time = datetime[1]?.split(':');
      this.ngbTime = {
        hour: +time[0],
        minute: +time[1],
        second: +time[2]
      };
    }
    this.markForCheck();
  }

  @HostListener('document:keydown.enter', ['$event'])
  @HostListener('document:keydown.escape', ['$event'])
  private keydownToCollapse() {
    this.collapse();
  }

  private markForCheck() {
    setTimeout(() => this.changeDetectorRef.markForCheck());
  }

  private initFormControl() {
    if (!this.formControl) {
      this.formControl = new FormControl(
        moment().format(this.format),
        [ValidatorsCheckDate(this.format)]
      );
    }
  }
}
