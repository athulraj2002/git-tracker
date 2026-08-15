import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  form,
  required,
  email,
  minLength,
  FormField,
} from '@angular/forms/signals';
import { Button, Checkbox, InputField } from '@org/ui';
import { AuthService } from '../../core/auth.service';
import { extractErrorMessage } from '../../core/http-error';

@Component({
  standalone: true,
  selector: 'app-signup',
  imports: [RouterLink, FormField, Button, Checkbox, InputField],
  templateUrl: './signup.html',
})
export class Signup {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal('');

  private readonly model = signal({
    name: '',
    email: '',
    password: '',
    acceptTerms: false,
  });
  protected readonly signupForm = form(this.model, (p) => {
    required(p.name, { message: 'Name is required.' });
    required(p.email, { message: 'Email is required.' });
    email(p.email, { message: 'Please enter a valid email.' });
    required(p.password, { message: 'Password is required.' });
    minLength(p.password, 8, {
      message: 'Password must be at least 8 characters.',
    });
    required(p.acceptTerms, {
      message: 'You must accept the terms to continue.',
    });
  });

  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.errorMessage.set('');

    this.signupForm.name().markAsTouched();
    this.signupForm.email().markAsTouched();
    this.signupForm.password().markAsTouched();
    this.signupForm.acceptTerms().markAsTouched();
    if (!this.signupForm().valid()) {
      return;
    }

    this.isSubmitting.set(true);
    try {
      const { name, email: emailValue, password } = this.model();
      await this.authService.signup({ name, email: emailValue, password });
      await this.router.navigateByUrl('/');
    } catch (error) {
      this.errorMessage.set(
        extractErrorMessage(
          error,
          'Unable to create your account. Please try again.',
        ),
      );
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
