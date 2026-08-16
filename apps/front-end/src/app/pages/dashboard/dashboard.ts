import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Button } from '@org/ui';
import type { TrackedRepo } from '@org/types';
import { AuthService } from '../../core/auth.service';
import { ReposService } from '../../core/repos.service';
import { extractErrorMessage } from '../../core/http-error';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, Button],
  templateUrl: './dashboard.html',
})
export class Dashboard implements OnInit {
  private readonly reposService = inject(ReposService);
  protected readonly authService = inject(AuthService);

  protected readonly repos = signal<TrackedRepo[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal('');

  async ngOnInit(): Promise<void> {
    try {
      this.repos.set(await this.reposService.getTrackedRepos());
    } catch (error) {
      this.errorMessage.set(
        extractErrorMessage(error, 'Unable to load your repositories.'),
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  protected logout(): void {
    this.authService.logout();
  }
}
