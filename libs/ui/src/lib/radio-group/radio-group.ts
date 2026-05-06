import { Component, input, signal, computed, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface RadioOption {
  value: string;
  label: string;
  hint?: string;
  disabled?: boolean;
}

let radioGroupIdCounter = 0;

@Component({
  standalone: true,
  selector: 'lib-ui-radio-group',
  templateUrl: './radio-group.html',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => RadioGroup),
      multi: true,
    },
  ],
})
export class RadioGroup implements ControlValueAccessor {
  private readonly _uid = `lib-ui-radio-${++radioGroupIdCounter}`;

  label = input<string>('');
  options = input<RadioOption[]>([]);
  name = input<string>(this._uid);
  errorMessage = input<string>('');
  hint = input<string>('');

  readonly selectedValue = signal<string>('');
  readonly isDisabled = signal(false);

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  readonly optionIds = computed(() =>
    this.options().map((_, i) => `${this.name()}-option-${i}`),
  );

  isSelected(value: string): boolean {
    return this.selectedValue() === value;
  }

  writeValue(value: string): void {
    this.selectedValue.set(value ?? '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled.set(isDisabled);
  }

  select(value: string): void {
    this.selectedValue.set(value);
    this.onChange(value);
    this.onTouched();
  }
}
