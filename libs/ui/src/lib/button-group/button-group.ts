import { Component, computed, input, model } from '@angular/core';

export interface ButtonGroupOption {
  value: string;
  label: string;
}

export type ButtonGroupSize = 'xs' | 'sm' | 'default' | 'lg';

// Matches the shadcn kit's Button Group border/radius/seam treatment
// (Figma: Button Group, node 1953:9006 - the "Examples" instance at
// 1953:28987) - joined bordered segments, not the app's old pill-track
// look. That source component has no active/selected state of its own
// (it's a generic multi-button wrapper, not a toggle), so the active
// look here (solid fill vs. bordered) is this app's own addition to make
// it work as a single-select toggle, matching how Button's primary/
// outline variants already read as "selected"/"not selected".
const sizeClasses: Record<ButtonGroupSize, string> = {
  xs: 'h-[22px] px-2 text-sm',
  sm: 'h-7 px-2 text-sm',
  default: 'h-8 px-2.5 text-sm',
  lg: 'h-9 px-2.5 text-sm',
};

/**
 * A segmented control for switching between a small, fixed set of mutually
 * exclusive options (e.g. view toggles) - not a form field, unlike RadioGroup.
 */
@Component({
  selector: 'lib-ui-button-group',
  templateUrl: './button-group.html',
})
export class ButtonGroup {
  options = input.required<ButtonGroupOption[]>();
  readonly value = model.required<string>();
  size = input<ButtonGroupSize>('sm');

  protected readonly segmentClasses = computed(() => sizeClasses[this.size()]);

  protected isActive(optionValue: string): boolean {
    return this.value() === optionValue;
  }
}
