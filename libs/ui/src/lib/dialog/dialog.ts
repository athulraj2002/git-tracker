import { Component, ElementRef, computed, effect, input, output, viewChild } from '@angular/core';

/**
 * A modal dialog built on the native <dialog> element (via showModal()), so
 * focus-trapping, Escape-to-close, and the backdrop all come from the
 * browser instead of being hand-rolled. Content is projected, so this has no
 * opinion on what goes inside beyond a title.
 */
@Component({
  selector: 'lib-ui-dialog',
  templateUrl: './dialog.html',
  styleUrls: ['./dialog.css'],
})
export class Dialog {
  open = input.required<boolean>();
  title = input<string>('');
  /** Extra Tailwind classes appended to the panel's own classes (e.g. a wider max-width). */
  class = input<string>('');
  readonly closed = output<void>();

  private readonly dialogRef = viewChild.required<ElementRef<HTMLDialogElement>>('dialogEl');

  protected readonly panelClasses = computed(() =>
    [
      'm-auto p-0 bg-gray-900 text-white border border-gray-800 rounded-lg shadow-xl',
      'w-full max-h-[85vh] overflow-y-auto',
      '[&::backdrop]:bg-black/60',
      this.class() || 'max-w-md',
    ].join(' '),
  );

  constructor() {
    // showModal()/close() throw or no-op if called when already in that
    // state - the `open` guards keep this effect idempotent across reruns.
    effect(() => {
      const dialogEl = this.dialogRef().nativeElement;
      if (this.open()) {
        if (!dialogEl.open) dialogEl.showModal();
      } else if (dialogEl.open) {
        dialogEl.close();
      }
    });
  }

  protected requestClose(): void {
    this.dialogRef().nativeElement.close();
  }

  // Fires for every native close path (Escape, requestClose(), a future
  // <form method="dialog"> submit) - the single place that syncs the
  // parent's `open` state back to reality, since the browser can close the
  // dialog (Escape) without us calling requestClose() ourselves.
  protected onNativeClose(): void {
    this.closed.emit();
  }

  // A click that lands on the ::backdrop is reported with the <dialog>
  // element itself as the target (it isn't a real, separately hit-testable
  // node) - anything inside the panel has its own element as the target.
  protected onDialogClick(event: MouseEvent): void {
    if (event.target === this.dialogRef().nativeElement) {
      this.requestClose();
    }
  }
}
