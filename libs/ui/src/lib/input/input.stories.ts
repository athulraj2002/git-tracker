import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { Component, signal } from '@angular/core';
import { form, required, email, FormField } from '@angular/forms/signals';
import { InputField, InputType } from './input';

@Component({
  selector: 'lib-demo-input-signal-form',
  imports: [FormField, InputField],
  template: `
    <div style="display:flex;flex-direction:column;gap:16px;max-width:320px;padding:24px;font-family:sans-serif;">
      <lib-ui-input
        label="Email"
        type="email"
        placeholder="you@example.com"
        [required]="true"
        [formField]="loginForm.email"
      ></lib-ui-input>
      <p style="font-size:12px;color:#888">
        Valid: {{ loginForm().valid() }} &nbsp;|&nbsp; Value: {{ loginForm().value().email || '—' }}
      </p>
    </div>
  `,
})
class DemoInputSignalForm {
  private readonly model = signal({ email: '' });
  protected readonly loginForm = form(this.model, (p) => {
    required(p.email, { message: 'Email is required.' });
    email(p.email, { message: 'Please enter a valid email.' });
  });
}

@Component({
  selector: 'lib-demo-input-login-form',
  imports: [FormField, InputField],
  template: `
    <div style="display:flex;flex-direction:column;gap:20px;max-width:360px;padding:32px;font-family:sans-serif;border:1px solid #e5e7eb;border-radius:12px;">
      <h2 style="margin:0;font-size:20px;font-weight:600;">Sign in</h2>
      <lib-ui-input label="Email" type="email" placeholder="you@example.com" [required]="true" [formField]="loginForm.email"></lib-ui-input>
      <lib-ui-input label="Password" type="password" placeholder="••••••••" [required]="true" [formField]="loginForm.password"></lib-ui-input>
    </div>
  `,
})
class DemoInputLoginForm {
  private readonly model = signal({ email: '', password: '' });
  protected readonly loginForm = form(this.model, (p) => {
    required(p.email, { message: 'Email is required.' });
    email(p.email, { message: 'Please enter a valid email.' });
    required(p.password, { message: 'Password is required.' });
  });
}

const meta: Meta<InputField> = {
  title: 'UI/InputField',
  component: InputField,
  tags: ['autodocs'],
  decorators: [
    moduleMetadata({
      imports: [FormField, DemoInputSignalForm, DemoInputLoginForm],
    }),
  ],
  args: {
    errors: [],
  },
  argTypes: {
    label: { control: 'text' },
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'number', 'tel', 'url'] satisfies InputType[],
    },
    placeholder: { control: 'text' },
    hint: { control: 'text' },
    invalid: { control: 'boolean' },
    touched: { control: 'boolean' },
  },
  render: (args) => ({
    props: args,
    template: `
      <lib-ui-input
        [label]="label"
        [type]="type"
        [placeholder]="placeholder"
        [hint]="hint"
        [invalid]="invalid"
        [touched]="touched"
        [errors]="errors"
      ></lib-ui-input>
    `,
  }),
};

export default meta;
type Story = StoryObj<InputField>;

export const Default: Story = {
  args: {
    label: 'Username',
    type: 'text',
    placeholder: 'Enter your username',
    hint: 'This will be your public display name.',
    invalid: false,
    touched: false,
  },
};

export const Email: Story = {
  args: {
    label: 'Email address',
    type: 'email',
    placeholder: 'you@example.com',
    hint: '',
    invalid: false,
    touched: false,
  },
};

export const Password: Story = {
  args: {
    label: 'Password',
    type: 'password',
    placeholder: '••••••••',
    hint: 'Must be at least 8 characters.',
    invalid: false,
    touched: false,
  },
};

export const WithError: Story = {
  args: {
    label: 'Email address',
    type: 'email',
    placeholder: 'you@example.com',
    hint: '',
    invalid: true,
    touched: true,
    errors: [{ kind: 'email', message: 'Please enter a valid email address.' }],
  },
};

export const NoLabel: Story = {
  args: {
    label: '',
    type: 'text',
    placeholder: 'Search…',
    hint: '',
    invalid: false,
    touched: false,
  },
};

export const WithSignalForm: Story = {
  render: () => ({
    props: {},
    template: `<lib-demo-input-signal-form></lib-demo-input-signal-form>`,
  }),
};

export const LoginForm: Story = {
  render: () => ({
    props: {},
    template: `<lib-demo-input-login-form></lib-demo-input-login-form>`,
  }),
};
