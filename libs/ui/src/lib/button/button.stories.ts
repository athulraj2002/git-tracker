import type { Meta, StoryObj } from '@storybook/angular';
import { Button, ButtonVariant } from './button';

const meta: Meta<Button> = {
  title: 'UI/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'danger', 'ghost', 'outline'] satisfies ButtonVariant[],
      description: 'Visual style of the button',
      table: {
        defaultValue: { summary: 'primary' },
      },
    },
    disabled: {
      control: 'boolean',
      description: 'Disables the button',
      table: {
        defaultValue: { summary: 'false' },
      },
    },
    type: {
      control: 'select',
      options: ['button', 'submit', 'reset'],
      description: 'Native HTML button type',
      table: {
        defaultValue: { summary: 'button' },
      },
    },
  },
  render: (args) => ({
    props: args,
    template: `<lib-ui-button [variant]="variant" [disabled]="disabled" [type]="type">Button</lib-ui-button>`,
  }),
};

export default meta;
type Story = StoryObj<Button>;

// ─── Individual variants ───────────────────────────────────────────────────

export const Primary: Story = {
  args: { variant: 'primary', disabled: false, type: 'button' },
};

export const Secondary: Story = {
  args: { variant: 'secondary', disabled: false, type: 'button' },
};

export const Danger: Story = {
  args: { variant: 'danger', disabled: false, type: 'button' },
  render: (args) => ({
    props: args,
    template: `<lib-ui-button [variant]="variant" [disabled]="disabled" [type]="type">Delete</lib-ui-button>`,
  }),
};

export const Ghost: Story = {
  args: { variant: 'ghost', disabled: false, type: 'button' },
};

export const Outline: Story = {
  args: { variant: 'outline', disabled: false, type: 'button' },
};

// ─── Disabled state ────────────────────────────────────────────────────────

export const Disabled: Story = {
  args: { variant: 'primary', disabled: true, type: 'button' },
  render: (args) => ({
    props: args,
    template: `<lib-ui-button [variant]="variant" [disabled]="disabled" [type]="type">Disabled</lib-ui-button>`,
  }),
};

// ─── All variants showcase ─────────────────────────────────────────────────

export const AllVariants: Story = {
  render: () => ({
    template: `
      <div style="display:flex; flex-direction:column; gap:24px; padding:24px; font-family:sans-serif;">

        <div>
          <p style="margin:0 0 10px; font-size:12px; color:#888; text-transform:uppercase; letter-spacing:.05em;">Variants</p>
          <div style="display:flex; flex-wrap:wrap; gap:12px; align-items:center;">
            <lib-ui-button variant="primary">Primary</lib-ui-button>
            <lib-ui-button variant="secondary">Secondary</lib-ui-button>
            <lib-ui-button variant="danger">Danger</lib-ui-button>
            <lib-ui-button variant="ghost">Ghost</lib-ui-button>
            <lib-ui-button variant="outline">Outline</lib-ui-button>
          </div>
        </div>

        <div>
          <p style="margin:0 0 10px; font-size:12px; color:#888; text-transform:uppercase; letter-spacing:.05em;">Disabled</p>
          <div style="display:flex; flex-wrap:wrap; gap:12px; align-items:center;">
            <lib-ui-button variant="primary" [disabled]="true">Primary</lib-ui-button>
            <lib-ui-button variant="secondary" [disabled]="true">Secondary</lib-ui-button>
            <lib-ui-button variant="danger" [disabled]="true">Danger</lib-ui-button>
            <lib-ui-button variant="ghost" [disabled]="true">Ghost</lib-ui-button>
            <lib-ui-button variant="outline" [disabled]="true">Outline</lib-ui-button>
          </div>
        </div>

        <div>
          <p style="margin:0 0 10px; font-size:12px; color:#888; text-transform:uppercase; letter-spacing:.05em;">With icons</p>
          <div style="display:flex; flex-wrap:wrap; gap:12px; align-items:center;">
            <lib-ui-button variant="primary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
              Download
            </lib-ui-button>
            <lib-ui-button variant="danger">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
              Delete
            </lib-ui-button>
            <lib-ui-button variant="outline">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              Search
            </lib-ui-button>
          </div>
        </div>

      </div>
    `,
  }),
};
