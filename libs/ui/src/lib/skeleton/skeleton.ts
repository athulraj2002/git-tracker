import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'lib-ui-skeleton',
  templateUrl: './skeleton.html',
})

/**
 *
 * Pulsing placeholder block shown while data is loading.
 *
 * @input class Tailwind sizing/shape classes (e.g. `h-4 w-24`) that
 * determine the skeleton's dimensions - the component has no size of its own.
 *
 */
export class Skeleton {
  class = input<string>('');

  classes = computed(() =>
    ['animate-pulse rounded-md bg-gray-800', this.class()].join(' '),
  );
}
