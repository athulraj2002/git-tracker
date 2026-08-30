import { Component, computed, input, model } from '@angular/core';

export interface SelectOption {
  value: string;
  label: string;
}

/**
 * A styled <select> for simple filter dropdowns - not a form field, unlike
 * InputField/RadioGroup/Checkbox.
 */
@Component({
  selector: 'lib-ui-select',
  templateUrl: './select.html',
})
export class Select {
  options = input.required<SelectOption[]>();
  readonly value = model.required<string>();
  /** Extra Tailwind classes appended to the select's own classes. */
  class = input<string>('');

  classes = computed(() =>
    [
      'bg-gray-900 border border-gray-800 rounded-lg text-xs text-gray-300',
      'px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-gray-600',
      this.class(),
    ].join(' '),
  );
}
