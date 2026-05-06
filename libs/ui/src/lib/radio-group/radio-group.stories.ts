import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { RadioGroup } from './radio-group';

const meta: Meta<RadioGroup> = {
  title: 'UI/RadioGroup',
  component: RadioGroup,
  tags: ['autodocs'],
  decorators: [
    moduleMetadata({
      imports: [ReactiveFormsModule],
    }),
  ],
  argTypes: {
    label: { control: 'text' },
    hint: { control: 'text' },
    errorMessage: { control: 'text' },
  },
  render: (args) => ({
    props: args,
    template: `
      <lib-ui-radio-group
        [label]="label"
        [options]="options"
        [hint]="hint"
        [errorMessage]="errorMessage"
      ></lib-ui-radio-group>
    `,
  }),
};

export default meta;
type Story = StoryObj<RadioGroup>;

export const Default: Story = {
  args: {
    label: 'Preferred contact method',
    options: [
      { value: 'email', label: 'Email' },
      { value: 'phone', label: 'Phone' },
      { value: 'slack', label: 'Slack' },
    ],
    hint: '',
    errorMessage: '',
  },
};

export const WithHints: Story = {
  args: {
    label: 'Account type',
    options: [
      { value: 'personal', label: 'Personal', hint: 'For individual developers.' },
      { value: 'team', label: 'Team', hint: 'Up to 25 members with shared billing.' },
      { value: 'enterprise', label: 'Enterprise', hint: 'Unlimited members, SSO and audit logs.' },
    ],
    hint: '',
    errorMessage: '',
  },
};

export const WithDisabledOption: Story = {
  args: {
    label: 'Subscription plan',
    options: [
      { value: 'free', label: 'Free' },
      { value: 'pro', label: 'Pro' },
      { value: 'enterprise', label: 'Enterprise', hint: 'Contact sales to enable.', disabled: true },
    ],
    hint: '',
    errorMessage: '',
  },
};

export const WithError: Story = {
  args: {
    label: 'Role',
    options: [
      { value: 'viewer', label: 'Viewer' },
      { value: 'editor', label: 'Editor' },
      { value: 'admin', label: 'Admin' },
    ],
    hint: '',
    errorMessage: 'Please select a role to continue.',
  },
};

export const WithReactiveForm: Story = {
  render: () => {
    const ctrl = new FormControl('', Validators.required);
    return {
      props: {
        ctrl,
        options: [
          { value: 'viewer', label: 'Viewer', hint: 'Read-only access.' },
          { value: 'editor', label: 'Editor', hint: 'Can create and edit content.' },
          { value: 'admin', label: 'Admin', hint: 'Full access including settings.' },
        ],
      },
      template: `
        <div style="display:flex;flex-direction:column;gap:16px;max-width:360px;padding:24px;font-family:sans-serif;">
          <lib-ui-radio-group
            label="Team role"
            [options]="options"
            [formControl]="ctrl"
            [errorMessage]="ctrl.invalid && ctrl.touched ? 'Please select a role.' : ''"
          ></lib-ui-radio-group>
          <p style="font-size:12px;color:#888">
            Value: {{ ctrl.value || '—' }} &nbsp;|&nbsp; Valid: {{ ctrl.valid }}
          </p>
        </div>
      `,
    };
  },
};

export const SignupForm: Story = {
  render: () => ({
    props: {},
    template: `
      <div style="display:flex;flex-direction:column;gap:24px;max-width:400px;padding:32px;font-family:sans-serif;border:1px solid #e5e7eb;border-radius:12px;">
        <h2 style="margin:0;font-size:20px;font-weight:600;">Set up your account</h2>
        <lib-ui-radio-group
          label="I am joining as a…"
          [options]="[
            { value: 'developer', label: 'Developer', hint: 'I write code and ship features.' },
            { value: 'manager', label: 'Engineering Manager', hint: 'I manage a team of developers.' },
            { value: 'lead', label: 'Tech Lead', hint: 'I do both.' }
          ]"
        ></lib-ui-radio-group>
      </div>
    `,
  }),
};
