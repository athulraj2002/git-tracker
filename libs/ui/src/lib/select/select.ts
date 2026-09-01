import { Component, computed, input, model } from '@angular/core';

export interface SelectOption {
  value: string;
  label: string;
}

export type SelectSize = 'xs' | 'sm' | 'default' | 'lg';

// Matches the shadcn kit's Select component (Figma: Select & Combobox,
// node 1953:9034) - same height scale as Button (22/28/32/36px), but its
// own smaller radius at the two smallest sizes (rounded-md vs rounded-lg).
// pr-8 (not the source's literal pr-2) reserves room for the chevron
// overlay, since a native <select> can't lay the icon out inline the way
// the Figma source's flex row does.
const sizeClasses: Record<SelectSize, string> = {
  xs: 'h-[22px] rounded-md',
  sm: 'h-7 rounded-md',
  default: 'h-8 rounded-lg',
  lg: 'h-9 rounded-lg',
};

/**
 * A styled <select> for simple filter dropdowns - not a form field, unlike
 * InputField/RadioGroup/Checkbox. The native appearance is hidden in favor
 * of a custom chevron so it renders consistently across browsers.
 */
@Component({
  selector: 'lib-ui-select',
  templateUrl: './select.html',
})
export class Select {
  options = input.required<SelectOption[]>();
  readonly value = model.required<string>();
  size = input<SelectSize>('default');
  invalid = input<boolean>(false);
  disabled = input<boolean>(false);
  /** Extra Tailwind classes appended to the select's own wrapper. */
  class = input<string>('');

  protected readonly wrapperClasses = computed(() => ['relative', this.class()].join(' '));

  protected readonly selectClasses = computed(() =>
    [
      'w-full appearance-none border bg-white text-black pl-2.5 pr-8 text-sm',
      'border-neutral-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white',
      'transition-colors duration-200 cursor-pointer',
      'focus:outline-none focus:!border-neutral-300 dark:focus:!border-gray-500',
      'focus-visible:ring-2 focus-visible:ring-offset-1',
      'focus-visible:ring-gray-400 dark:focus-visible:ring-gray-600',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      sizeClasses[this.size()],
      this.invalid() ? '!border-red-600 ring-2 ring-red-200 dark:ring-red-900/50' : '',
    ].join(' '),
  );

  protected onChange(event: Event): void {
    this.value.set((event.target as HTMLSelectElement).value);
  }
}
