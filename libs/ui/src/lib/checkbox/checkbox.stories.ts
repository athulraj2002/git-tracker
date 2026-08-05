import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { Component, signal } from '@angular/core';
import { form, required, FormField } from '@angular/forms/signals';
import { Checkbox } from './checkbox';

@Component({
  standalone: true,
  selector: 'lib-demo-checkbox-signal-form',
  imports: [FormField, Checkbox],
  template: `
    <div style="display:flex;flex-direction:column;gap:12px;max-width:320px;padding:24px;font-family:sans-serif;">
      <lib-ui-checkbox
        label="I agree to the terms and conditions"
        [formField]="signupForm.acceptTerms"
      ></lib-ui-checkbox>
      <p style="font-size:12px;color:#888">
        Checked: {{ signupForm().value().acceptTerms }} &nbsp;|&nbsp; Valid: {{ signupForm().valid() }}
      </p>
    </div>
  `,
})
class DemoCheckboxSignalForm {
  private readonly model = signal({ acceptTerms: false });
  protected readonly signupForm = form(this.model, (p) => {
    required(p.acceptTerms, { message: 'You must accept the terms to continue.' });
  });
}

const meta: Meta<Checkbox> = {
  title: 'UI/Checkbox',
  component: Checkbox,
  tags: ['autodocs'],
  decorators: [
    moduleMetadata({
      imports: [FormField, DemoCheckboxSignalForm],
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
      <lib-ui-checkbox
        [label]="label"
        [hint]="hint"
        [invalid]="invalid"
        [touched]="touched"
        [errors]="errors"
      ></lib-ui-checkbox>
    `,
  }),
};

export default meta;
type Story = StoryObj<Checkbox>;

export const Default: Story = {
  args: {
    label: 'I agree to the terms and conditions',
    hint: '',
    invalid: false,
    touched: false,
  },
};

export const WithHint: Story = {
  args: {
    label: 'Subscribe to newsletter',
    hint: 'You can unsubscribe at any time.',
    invalid: false,
    touched: false,
  },
};

export const WithError: Story = {
  args: {
    label: 'I agree to the terms and conditions',
    hint: '',
    invalid: true,
    touched: true,
    errors: [{ kind: 'required', message: 'You must accept the terms to continue.' }],
  },
};

export const Disabled: Story = {
  render: () => ({
    props: {},
    template: `<lib-ui-checkbox label="This option is unavailable" [disabled]="true"></lib-ui-checkbox>`,
  }),
};

export const WithSignalForm: Story = {
  render: () => ({
    props: {},
    template: `<lib-demo-checkbox-signal-form></lib-demo-checkbox-signal-form>`,
  }),
};

export const SignupForm: Story = {
  render: () => ({
    props: {},
    template: `
      <div style="display:flex;flex-direction:column;gap:16px;max-width:360px;padding:32px;font-family:sans-serif;border:1px solid #e5e7eb;border-radius:12px;">
        <h2 style="margin:0;font-size:20px;font-weight:600;">Create account</h2>
        <lib-ui-checkbox label="Subscribe to product updates and announcements" hint="We send at most one email per week."></lib-ui-checkbox>
        <lib-ui-checkbox label="I agree to the Terms of Service and Privacy Policy"></lib-ui-checkbox>
      </div>
    `,
  }),
};
