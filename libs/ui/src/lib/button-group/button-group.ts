import { Component, input, model } from '@angular/core';

export interface ButtonGroupOption {
  value: string;
  label: string;
}

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
}
