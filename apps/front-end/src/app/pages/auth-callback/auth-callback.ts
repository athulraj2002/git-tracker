import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { ReposService } from '../../core/repos.service';
import { extractErrorMessage } from '../../core/http-error';

@Component({
  selector: 'app-auth-callback',
  imports: [RouterLink],
  templateUrl: './auth-callback.html',
})
export class AuthCallback implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly reposService = inject(ReposService);

  protected readonly errorMessage = signal('');

  async ngOnInit(): Promise<void> {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.errorMessage.set('Sign-in did not return an access token.');
      return;
    }

    try {
      await this.authService.completeOAuthLogin(token);
      const tracked = await this.reposService.getTrackedRepos();
      await this.router.navigateByUrl(
        tracked.length > 0 ? '/dashboard' : '/select-repos',
      );
    } catch (error) {
      this.errorMessage.set(
        extractErrorMessage(error, 'Unable to complete sign-in.'),
      );
    }
  }
}
