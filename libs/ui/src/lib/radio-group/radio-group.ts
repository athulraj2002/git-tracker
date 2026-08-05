import { Component, input, model, computed } from '@angular/core';
import type { FormValueControl, ValidationError } from '@angular/forms/signals';

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
})
export class RadioGroup implements FormValueControl<string> {
  private readonly _uid = `lib-ui-radio-${++radioGroupIdCounter}`;

  label = input<string>('');
  options = input<RadioOption[]>([]);
  name = input<string>(this._uid);
  hint = input<string>('');
  required = input<boolean>(false);

  readonly value = model<string>('');
  readonly disabled = input<boolean>(false);
  readonly invalid = input<boolean>(false);
  readonly touched = model<boolean>(false);
  readonly errors = input<readonly ValidationError.WithOptionalFieldTree[]>([]);

  readonly optionIds = computed(() =>
    this.options().map((_, i) => `${this.name()}-option-${i}`),
  );

  readonly displayError = computed(() => {
    if (!this.touched() || !this.invalid()) return '';
    return this.errors()[0]?.message ?? 'This field is invalid.';
  });

  isSelected(optionValue: string): boolean {
    return this.value() === optionValue;
  }

  select(optionValue: string): void {
    this.value.set(optionValue);
    this.touched.set(true);
  }
}
