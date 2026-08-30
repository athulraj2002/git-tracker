import { Component, input, model } from '@angular/core';

/**
 * A boolean on/off switch (role="switch") for settings that take effect
 * immediately - unlike Checkbox, this isn't a form control (no
 * FormCheckboxControl, no label/hint/error rendering). A switch has no
 * visible text of its own, so `label` is required and rendered as an
 * aria-label rather than visible content.
 */
@Component({
  selector: 'lib-ui-toggle',
  templateUrl: './toggle.html',
})
export class Toggle {
  readonly checked = model<boolean>(false);
  readonly disabled = input<boolean>(false);
  label = input.required<string>();

  protected toggle(): void {
    if (this.disabled()) return;
    this.checked.update((value) => !value);
  }
}
