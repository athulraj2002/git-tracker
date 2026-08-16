import { Component, inject, signal } from '@angular/core';
import { Button } from '@org/ui';
import { AuthService, type OAuthProvider } from '../../core/auth.service';
import { extractErrorMessage } from '../../core/http-error';

@Component({
  selector: 'app-login',
  imports: [Button],
  templateUrl: './login.html',
})
export class Login {
  private readonly authService = inject(AuthService);

  protected readonly errorMessage = signal('');
  protected readonly loadingProvider = signal<OAuthProvider | null>(null);

  protected async continueWith(provider: OAuthProvider): Promise<void> {
    this.errorMessage.set('');
    this.loadingProvider.set(provider);
    try {
      const url = await this.authService.getOAuthAuthorizeUrl(provider);
      window.location.href = url;
    } catch (error) {
      this.errorMessage.set(
        extractErrorMessage(error, 'Unable to start sign-in.'),
      );
      this.loadingProvider.set(null);
    }
  }
}
