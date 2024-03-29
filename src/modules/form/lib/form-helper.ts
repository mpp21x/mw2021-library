import {AbstractControl, UntypedFormControl, UntypedFormGroup} from '@angular/forms';
import {HttpErrorResponse, HttpResponse} from '@angular/common/http';
import * as R from 'ramda';
import {LoadingController} from '../../loading/lib/loading-controller';
import {FormHttpErrorMessenger} from './form-http-error-messenger';
import {Observable} from 'rxjs';
import {tap} from 'rxjs/operators';
import {FormEnding} from './form-ending';
import {NgErrorMessenger} from './plugin/ng-error-messenger';
import {StatusCode} from '../../../lib/http/status-code';

export class FormHelper {
  defaultErrorMessage = '儲存失敗';
  defaultUnableSubmitMessage = '表單尚未輸入完！請輸入完後再次提交';
  protected isStopSubmit = false;

  constructor(
    protected readonly loading: LoadingController,
    protected readonly ending: FormEnding<unknown>,
    protected readonly ngErrorMessenger: NgErrorMessenger,
    protected readonly httpErrorMessenger: FormHttpErrorMessenger,
    protected readonly _form: UntypedFormGroup
  ) {
  }

  unableToSubmit(): boolean {
    this._form.markAllAsTouched();
    if (this.isStopSubmit) {
      return true;
    }
    if (this._form.invalid) {
      this.endLoading(false, this.defaultUnableSubmitMessage).then();
      return true;
    }
    return false;
  }

  /**
   * 常用於清除預設值，以及開啟載入畫面
   */
  beforeSubmit() {
    this.isStopSubmit = true;
    this.httpErrorMessenger.clean();
    this.loading.start();
    return this;
  }

  async endLoading(result: boolean, msg: string, detailMsg = '') {
    this.isStopSubmit = false;
    return this.ending.end({
      result,
      message: msg,
      detailMsg,
    });
  }

  defaultFormSubmitSuccessFn() {
    return R.curry((statusCode: StatusCode, res: HttpResponse<any>) => {
      const results: [boolean, string?, string?] = res.status === statusCode ?
        [true, '儲存成功'] :
        [false];
      return this.endLoading(...results);
    });
  }

  afterSubmit<T>(rx: Observable<T>) {
    const fn = () => {
      this.loading.end();
      this.isStopSubmit = false;
    };
    return rx.pipe(tap({
      next: fn,
      error: fn,
    }));
  }

  setFormErrorByResponse(res: HttpErrorResponse): void {
    this.httpErrorMessenger.setMessagesFromHttp(this._form, res);
  }

  controlIsInvalid(controlName: string, isInside = false): boolean {
    try {
      let control: AbstractControl;
      if (!isInside) {
        control = this.getInnerControl(controlName);
      } else {
        control = this.getInnerControl(controlName);
      }

      return control.invalid && control.touched;
    } catch (e) {
      return false;
    }
  }

  controlMessage(controlName: string): string[] {
    if (!this.controlIsInvalid(controlName)) {
      return [];
    }
    let errorMessages = this.ngErrorMessenger.getMessagesFromControlErrors(
      this.getInnerControl(controlName).errors
    );
    errorMessages = errorMessages.concat(this.httpErrorMessenger.getMessage(controlName));

    return errorMessages;
  }

  controlMessageJoin(controlName: string) {
    return this.controlMessage(controlName).join(',');
  }

  subscribeHttpResult(successStatusCode: StatusCode) {
    return {
      next: this.defaultFormSubmitSuccessFn()(successStatusCode),
      error: this.defaultFormSubmitFailedFn(),
    };
  }

  defaultFormSubmitFailedFn(): (res: HttpErrorResponse) => void {
    return (res: HttpErrorResponse): void => {
      if (res.status === StatusCode.UNAUTHORIZED) {
        return;
      }
      let detailMessage = '';
      switch (res.status) {
        case StatusCode.UNPROCESSABLE_ENTITY:
        case StatusCode.CONFLICT:
          this.setFormErrorByResponse(res);
          detailMessage = '表單輸入不允許的數值，請修改表單';
          break;
        default:
          if (R.path(['errors', 'message'], res)) {
            detailMessage = res.error.message;
          } else {
            detailMessage = '連線異常！請稍後再試';
          }
          break;
      }
      this.endLoading(false, this.defaultErrorMessage, detailMessage).then();
      return;
    };
  }

  get form(): UntypedFormGroup {
    return this._form;
  }

  getInnerControl(controlName: string) {
    const controlNames = controlName.split(',');

    function recursiveFn(form: UntypedFormGroup, names: string[]) {
      const name = names.shift();
      const result = form.controls[name];
      return result instanceof UntypedFormControl ? result : recursiveFn(result as UntypedFormGroup, names);
    }

    return recursiveFn(this._form, controlNames);
  }
}
