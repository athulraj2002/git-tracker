import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Checkbox } from './checkbox';

const meta: Meta<Checkbox> = {
  title: 'UI/Checkbox',
  component: Checkbox,
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
      <lib-ui-checkbox
        [label]="label"
        [hint]="hint"
        [errorMessage]="errorMessage"
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
    errorMessage: '',
  },
};

export const WithHint: Story = {
  args: {
    label: 'Subscribe to newsletter',
    hint: 'You can unsubscribe at any time.',
    errorMessage: '',
  },
};

export const WithError: Story = {
  args: {
    label: 'I agree to the terms and conditions',
    hint: '',
    errorMessage: 'You must accept the terms to continue.',
  },
};

export const Disabled: Story = {
  render: () => ({
    props: {},
    template: `<lib-ui-checkbox label="This option is unavailable" [isDisabled]="true"></lib-ui-checkbox>`,
  }),
};

export const WithReactiveForm: Story = {
  render: () => {
    const ctrl = new FormControl(false, Validators.requiredTrue);
    return {
      props: { ctrl },
      template: `
        <div style="display:flex;flex-direction:column;gap:12px;max-width:320px;padding:24px;font-family:sans-serif;">
          <lib-ui-checkbox
            label="I agree to the terms and conditions"
            [formControl]="ctrl"
            [errorMessage]="ctrl.invalid && ctrl.touched ? 'You must accept to continue.' : ''"
          ></lib-ui-checkbox>
          <p style="font-size:12px;color:#888">
            Checked: {{ ctrl.value }} &nbsp;|&nbsp; Valid: {{ ctrl.valid }}
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
      <div style="display:flex;flex-direction:column;gap:16px;max-width:360px;padding:32px;font-family:sans-serif;border:1px solid #e5e7eb;border-radius:12px;">
        <h2 style="margin:0;font-size:20px;font-weight:600;">Create account</h2>
        <lib-ui-checkbox label="Subscribe to product updates and announcements" hint="We send at most one email per week."></lib-ui-checkbox>
        <lib-ui-checkbox label="I agree to the Terms of Service and Privacy Policy"></lib-ui-checkbox>
      </div>
    `,
  }),
};
