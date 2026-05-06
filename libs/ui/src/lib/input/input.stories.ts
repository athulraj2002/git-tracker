import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { InputField, InputType } from './input';

const meta: Meta<InputField> = {
  title: 'UI/InputField',
  component: InputField,
  tags: ['autodocs'],
  decorators: [
    moduleMetadata({
      imports: [ReactiveFormsModule],
    }),
  ],
  argTypes: {
    label: { control: 'text' },
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'number', 'tel', 'url'] satisfies InputType[],
    },
    placeholder: { control: 'text' },
    hint: { control: 'text' },
    errorMessage: { control: 'text' },
  },
  render: (args) => ({
    props: args,
    template: `
      <lib-ui-input
        [label]="label"
        [type]="type"
        [placeholder]="placeholder"
        [hint]="hint"
        [errorMessage]="errorMessage"
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
    errorMessage: '',
  },
};

export const Email: Story = {
  args: {
    label: 'Email address',
    type: 'email',
    placeholder: 'you@example.com',
    hint: '',
    errorMessage: '',
  },
};

export const Password: Story = {
  args: {
    label: 'Password',
    type: 'password',
    placeholder: '••••••••',
    hint: 'Must be at least 8 characters.',
    errorMessage: '',
  },
};

export const WithError: Story = {
  args: {
    label: 'Email address',
    type: 'email',
    placeholder: 'you@example.com',
    hint: '',
    errorMessage: 'Please enter a valid email address.',
  },
};

export const NoLabel: Story = {
  args: {
    label: '',
    type: 'text',
    placeholder: 'Search…',
    hint: '',
    errorMessage: '',
  },
};

export const WithReactiveForm: Story = {
  render: () => {
    const ctrl = new FormControl('', [Validators.required, Validators.email]);
    return {
      props: { ctrl },
      template: `
        <div style="display:flex;flex-direction:column;gap:16px;max-width:320px;padding:24px;font-family:sans-serif;">
          <lib-ui-input
            label="Email"
            type="email"
            placeholder="you@example.com"
            [formControl]="ctrl"
            [errorMessage]="ctrl.invalid && ctrl.touched ? 'Please enter a valid email.' : ''"
          ></lib-ui-input>
          <p style="font-size:12px;color:#888">
            Status: {{ ctrl.status }} &nbsp;|&nbsp; Value: {{ ctrl.value || '—' }}
          </p>
        </div>
      `,
    };
  },
};

export const LoginForm: Story = {
  render: () => ({
    props: {},
    template: `
      <div style="display:flex;flex-direction:column;gap:20px;max-width:360px;padding:32px;font-family:sans-serif;border:1px solid #e5e7eb;border-radius:12px;">
        <h2 style="margin:0;font-size:20px;font-weight:600;">Sign in</h2>
        <lib-ui-input label="Email" type="email" placeholder="you@example.com"></lib-ui-input>
        <lib-ui-input label="Password" type="password" placeholder="••••••••"></lib-ui-input>
      </div>
    `,
  }),
};
