import { Component, input, model, computed } from '@angular/core';
import type { FormValueControl, ValidationError } from '@angular/forms/signals';

export type InputType =
  'text' | 'email' | 'password' | 'number' | 'tel' | 'url';

let inputIdCounter = 0;

@Component({
  standalone: true,
  selector: 'lib-ui-input',
  templateUrl: './input.html',
})
export class InputField implements FormValueControl<string> {
  private readonly _uid = `lib-ui-input-${++inputIdCounter}`;

  label = input<string>('');
  type = input<InputType>('text');
  placeholder = input<string>('');
  hint = input<string>('');
  id = input<string>(this._uid);

  readonly value = model<string>('');
  readonly disabled = input<boolean>(false);
  readonly required = input<boolean>(false);
  readonly invalid = input<boolean>(false);
  readonly touched = model<boolean>(false);
  readonly errors = input<readonly ValidationError.WithOptionalFieldTree[]>([]);

  readonly displayError = computed(() => {
    if (!this.touched() || !this.invalid()) return '';
    return this.errors()[0]?.message ?? 'This field is invalid.';
  });

  readonly inputClasses = computed(() =>
    [
      'w-full px-3 py-1.5 text-sm rounded-lg border',
      'bg-white dark:bg-gray-900 text-gray-900 dark:text-white',
      'placeholder:text-gray-400',
      'transition-colors duration-200',
      'focus:outline-none ',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      this.displayError()
        ? 'border-red-500 focus-visible:ring-red-500'
        : 'border-gray-300 dark:border-gray-600',
    ].join(' '),
  );

  onInput(event: Event): void {
    this.value.set((event.target as HTMLInputElement).value);
  }

  onBlur(): void {
    this.touched.set(true);
  }
}
