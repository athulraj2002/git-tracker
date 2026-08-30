import { Component, computed, inject } from '@angular/core';
import { Skeleton } from '@org/ui';
import { AuthService } from '../../core/services/auth.service';
import { extractErrorMessage } from '@org/helpers';

@Component({
  selector: 'app-settings',
  imports: [Skeleton],
  templateUrl: './settings.html',
})
export class Settings {
  protected readonly authService = inject(AuthService);

  private readonly identitiesResource = this.authService.identities();

  protected readonly identities = this.identitiesResource.value;

  protected readonly isLoading = computed(
    () => this.identitiesResource.status() === 'loading',
  );
  protected readonly errorMessage = computed(() => {
    const error = this.identitiesResource.error();
    return error ? extractErrorMessage(error, 'Unable to load your settings.') : '';
  });
}
