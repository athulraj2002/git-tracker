import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ButtonVariant = 'primary' | 'secondary' | 'danger'|'ghost'|'outline';

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-black text-white hover:bg-black/90',
  secondary:
    'bg-gray-200 text-gray-900 hover:bg-gray-300 ',
  danger: 'bg-red-200 text-red-600 hover:bg-red-300 ',
  ghost:'text-black dark:text-white hover hover:bg-gray-200 dark:hover:bg-gray-800',
  outline:'border !border-gray-300 text-black dark:text-white hover:bg-gray-300 dark:hover:bg-gray-800'
};

@Component({
  selector: 'lib-ui-button',
  imports: [CommonModule],
  templateUrl: './button.html',
})

/**
 *
 * Reusable UI button component with variant-based styling.
 *
 * @input variant Visual style of the button. Defaults to `primary`.
 *
 * @input disabled Disables the button when set to `true`.
 *
 * @input type Native button type. Defaults to `button`.
 *
 */
export class Button {
  variant = input<ButtonVariant>('primary');
  disabled = input<boolean>();
  type = input<'button' | 'submit' | 'reset'>('button');

  classes = computed(() =>
    [
      'inline-flex items-center gap-2 justify-center border border-transparent',
      'p-2.5 rounded-[10px] text-sm h-10  cursor-pointer',
      'transition-colors duration-200',
      'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      variantClasses[this.variant()],
    ].join(' '),
  );
}
