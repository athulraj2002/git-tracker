import { Component, input, model, computed } from '@angular/core';
import type { FormCheckboxControl, ValidationError } from '@angular/forms/signals';

let checkboxIdCounter = 0;

@Component({
  selector: 'lib-ui-checkbox',
  templateUrl: './checkbox.html',
})
export class Checkbox implements FormCheckboxControl {
  private readonly _uid = `lib-ui-checkbox-${++checkboxIdCounter}`;

  label = input<string>('');
  hint = input<string>('');
  id = input<string>(this._uid);

  readonly checked = model<boolean>(false);
  readonly disabled = input<boolean>(false);
  readonly invalid = input<boolean>(false);
  readonly touched = model<boolean>(false);
  readonly errors = input<readonly ValidationError.WithOptionalFieldTree[]>([]);

  readonly displayError = computed(() => {
    if (!this.touched() || !this.invalid()) return '';
    return this.errors()[0]?.message ?? 'This field is invalid.';
  });

  toggle(event: Event): void {
    this.checked.set((event.target as HTMLInputElement).checked);
    this.touched.set(true);
  }
}
