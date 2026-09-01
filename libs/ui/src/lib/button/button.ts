import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Spinner } from '../spinner/spinner';

export type ButtonVariant =
  'primary' | 'secondary' | 'outline' | 'ghost' | 'link' | 'destructive';
export type ButtonSize = 'xs' | 'sm' | 'default' | 'lg';

// Matches the shadcn kit's Button component (Figma: Button & Icon Button,
// node 1953:9005) - 6 variants x 4 sizes x {default, hover, focus, invalid,
// disabled}. Hover across every filled variant is a flat opacity dip rather
// than a distinct hover color, straight from the source: Primary/Destructive
// hover at opacity-90, Secondary at opacity-80.
const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-neutral-900 text-white hover:opacity-90 dark:bg-white dark:text-black',
  secondary:
    'bg-neutral-100 text-neutral-900 hover:opacity-80 dark:bg-gray-800 dark:text-gray-100',
  outline:
    'border !border-neutral-200 bg-white text-black hover:bg-neutral-100 dark:!border-gray-700 dark:bg-gray-900 dark:text-white dark:hover:bg-gray-800',
  ghost: 'text-black hover:bg-gray-100 dark:text-white dark:hover:bg-gray-800',
  // Never gets a background, at rest or on hover - underline is the only
  // hover affordance, matching the Figma source exactly.
  link: 'text-black hover:underline dark:text-white',
  // A "soft" destructive style (light red fill, red text), not solid red -
  // this is the shade the Figma source actually uses, not the more common
  // solid-red-button convention.
  destructive:
    'bg-red-100 text-red-700 hover:opacity-90 dark:bg-red-950 dark:text-red-400',
};

// Horizontal padding and gap stay constant across sizes in the source file;
// only vertical padding (and therefore height) changes. rounded-lg (not the
// source's literal 10px) matches every other rounded surface in this app.
const sizeClasses: Record<ButtonSize, string> = {
  xs: 'h-[22px] px-2.5 py-px text-sm gap-1',
  sm: 'h-7 px-2.5 py-1 text-sm gap-1.5',
  default: 'h-8 px-2.5 py-1.5 text-sm gap-1.5',
  lg: 'h-9 px-2.5 py-2 text-sm gap-1.5',
};

@Component({
  selector: 'lib-ui-button',
  imports: [CommonModule, Spinner],
  templateUrl: './button.html',
})

/**
 *
 * Reusable UI button component with variant- and size-based styling.
 *
 * @input variant Visual style of the button. Defaults to `primary`.
 *
 * @input size Height/padding scale of the button. Defaults to `default`.
 *
 * @input invalid Shows the error-state ring (e.g. bound to a form field's
 * validity), independent of variant.
 *
 * @input disabled Disables the button when set to `true`.
 *
 * @input type Native button type. Defaults to `button`.
 *
 * @input class Extra Tailwind classes appended to the button's own classes,
 * so a parent can tweak styling (e.g. `class="w-full"`).
 *
 */
export class Button {
  variant = input<ButtonVariant>('primary');
  size = input<ButtonSize>('default');
  invalid = input<boolean>(false);
  disabled = input<boolean>();
  type = input<'button' | 'submit' | 'reset'>('button');
  isLoading = input<boolean>(false);
  class = input<string>('');

  classes = computed(() =>
    [
      'inline-flex items-center justify-center border border-transparent',
      'rounded-lg cursor-pointer',
      'transition-colors duration-200',
      'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
      'focus-visible:ring-gray-400 dark:focus-visible:ring-gray-600',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      sizeClasses[this.size()],
      variantClasses[this.variant()],
      this.invalid() ? '!border-red-600 ring-2 ring-red-200 dark:ring-red-900/50' : '',
      this.class(),
    ].join(' '),
  );
}
