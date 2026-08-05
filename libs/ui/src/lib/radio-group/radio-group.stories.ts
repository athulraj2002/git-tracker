import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { Component, signal } from '@angular/core';
import { form, required, FormField } from '@angular/forms/signals';
import { RadioGroup } from './radio-group';

@Component({
  standalone: true,
  selector: 'lib-demo-radio-group-signal-form',
  imports: [FormField, RadioGroup],
  template: `
    <div style="display:flex;flex-direction:column;gap:16px;max-width:360px;padding:24px;font-family:sans-serif;">
      <lib-ui-radio-group
        label="Team role"
        [options]="options"
        [formField]="teamForm.role"
      ></lib-ui-radio-group>
      <p style="font-size:12px;color:#888">
        Value: {{ teamForm().value().role || '—' }} &nbsp;|&nbsp; Valid: {{ teamForm().valid() }}
      </p>
    </div>
  `,
})
class DemoRadioGroupSignalForm {
  protected readonly options = [
    { value: 'viewer', label: 'Viewer', hint: 'Read-only access.' },
    { value: 'editor', label: 'Editor', hint: 'Can create and edit content.' },
    { value: 'admin', label: 'Admin', hint: 'Full access including settings.' },
  ];
  private readonly model = signal({ role: '' });
  protected readonly teamForm = form(this.model, (p) => {
    required(p.role, { message: 'Please select a role.' });
  });
}

const meta: Meta<RadioGroup> = {
  title: 'UI/RadioGroup',
  component: RadioGroup,
  tags: ['autodocs'],
  decorators: [
    moduleMetadata({
      imports: [FormField, DemoRadioGroupSignalForm],
    }),
  ],
  args: {
    errors: [],
  },
  argTypes: {
    label: { control: 'text' },
    hint: { control: 'text' },
    invalid: { control: 'boolean' },
    touched: { control: 'boolean' },
  },
  render: (args) => ({
    props: args,
    template: `
      <lib-ui-radio-group
        [label]="label"
        [options]="options"
        [hint]="hint"
        [invalid]="invalid"
        [touched]="touched"
        [errors]="errors"
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
    invalid: false,
    touched: false,
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
    invalid: false,
    touched: false,
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
    invalid: false,
    touched: false,
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
    invalid: true,
    touched: true,
    errors: [{ kind: 'required', message: 'Please select a role to continue.' }],
  },
};

export const WithSignalForm: Story = {
  render: () => ({
    props: {},
    template: `<lib-demo-radio-group-signal-form></lib-demo-radio-group-signal-form>`,
  }),
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
