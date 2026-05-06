import { Component, input, signal, computed, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export type InputType = 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';

let inputIdCounter = 0;

@Component({
  standalone: true,
  selector: 'lib-ui-input',
  templateUrl: './input.html',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputField),
      multi: true,
    },
  ],
})
export class InputField implements ControlValueAccessor {
  private readonly _uid = `lib-ui-input-${++inputIdCounter}`;

  label = input<string>('');
  type = input<InputType>('text');
  placeholder = input<string>('');
  hint = input<string>('');
  errorMessage = input<string>('');
  id = input<string>(this._uid);

  readonly value = signal<string>('');
  readonly isDisabled = signal(false);

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  readonly inputClasses = computed(() =>
    [
      'w-full px-3 py-2 text-sm rounded-[10px] border',
      'bg-white dark:bg-gray-900 text-gray-900 dark:text-white',
      'placeholder:text-gray-400',
      'transition-colors duration-200',
      'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-black dark:focus-visible:ring-white',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      this.errorMessage()
        ? 'border-red-500 focus-visible:ring-red-500'
        : 'border-gray-300 dark:border-gray-600',
    ].join(' '),
  );

  writeValue(value: string): void {
    this.value.set(value ?? '');
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

  onInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.value.set(val);
    this.onChange(val);
  }

  onBlur(): void {
    this.onTouched();
  }
}
