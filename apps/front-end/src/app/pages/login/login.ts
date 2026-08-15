import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { form, required, email, FormField } from '@angular/forms/signals';
import { Button, InputField } from '@org/ui';
import { AuthService } from '../../core/auth.service';
import { extractErrorMessage } from '../../core/http-error';

@Component({
  standalone: true,
  selector: 'app-login',
  imports: [RouterLink, FormField, Button, InputField],
  templateUrl: './login.html',
})
export class Login {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal('');

  private readonly model = signal({ email: '', password: '' });
  protected readonly loginForm = form(this.model, (p) => {
    required(p.email, { message: 'Email is required.' });
    email(p.email, { message: 'Please enter a valid email.' });
    required(p.password, { message: 'Password is required.' });
  });

  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.errorMessage.set('');

    this.loginForm.email().markAsTouched();
    this.loginForm.password().markAsTouched();
    if (!this.loginForm().valid()) {
      return;
    }

    this.isSubmitting.set(true);
    try {
      await this.authService.login(this.model());
      await this.router.navigateByUrl('/');
    } catch (error) {
      this.errorMessage.set(
        extractErrorMessage(error, 'Unable to sign in. Please try again.'),
      );
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
