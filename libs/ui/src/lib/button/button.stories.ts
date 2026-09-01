import type { Meta, StoryObj } from '@storybook/angular';
import { Button, ButtonSize, ButtonVariant } from './button';

const meta: Meta<Button & { label: string }> = {
  title: 'UI/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    label: {
      control: 'text',
      description: 'Button label text',
      table: {
        defaultValue: { summary: 'Button' },
      },
    },
    variant: {
      control: 'select',
      options: [
        'primary',
        'secondary',
        'outline',
        'ghost',
        'link',
        'destructive',
      ] satisfies ButtonVariant[],
      description: 'Visual style of the button',
      table: {
        defaultValue: { summary: 'primary' },
      },
    },
    size: {
      control: 'select',
      options: ['xs', 'sm', 'default', 'lg'] satisfies ButtonSize[],
      description: 'Height/padding scale of the button',
      table: {
        defaultValue: { summary: 'default' },
      },
    },
    invalid: {
      control: 'boolean',
      description: 'Shows the error-state ring, independent of variant',
      table: {
        defaultValue: { summary: 'false' },
      },
    },
    disabled: {
      control: 'boolean',
      description: 'Disables the button',
      table: {
        defaultValue: { summary: 'false' },
      },
    },
    isLoading: {
      control: 'boolean',
      description: 'Shows a spinner inside the button',
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
    class: {
      control: 'text',
      description: "Extra Tailwind classes appended to the button's own classes",
      table: {
        defaultValue: { summary: "''" },
      },
    },
  },
  render: (args) => ({
    props: args,
    template: `<lib-ui-button [variant]="variant" [size]="size" [invalid]="invalid" [disabled]="disabled" [type]="type" [isLoading]="isLoading" [class]="class">{{ label }}</lib-ui-button>`,
  }),
};

export default meta;
type Story = StoryObj<Button & { label: string }>;

// ─── Individual variants ───────────────────────────────────────────────────

export const Primary: Story = {
  args: {
    label: 'Button',
    variant: 'primary',
    size: 'default',
    invalid: false,
    disabled: false,
    isLoading: false,
    type: 'button',
  },
};

export const Secondary: Story = {
  args: {
    label: 'Button',
    variant: 'secondary',
    size: 'default',
    disabled: false,
    isLoading: false,
    type: 'button',
  },
};

export const Outline: Story = {
  args: {
    label: 'Button',
    variant: 'outline',
    size: 'default',
    disabled: false,
    isLoading: false,
    type: 'button',
  },
};

export const Ghost: Story = {
  args: {
    label: 'Button',
    variant: 'ghost',
    size: 'default',
    disabled: false,
    isLoading: false,
    type: 'button',
  },
};

export const Link: Story = {
  args: {
    label: 'Button',
    variant: 'link',
    size: 'default',
    disabled: false,
    isLoading: false,
    type: 'button',
  },
};

export const Destructive: Story = {
  args: {
    label: 'Delete',
    variant: 'destructive',
    size: 'default',
    disabled: false,
    isLoading: false,
    type: 'button',
  },
};

// ─── States ────────────────────────────────────────────────────────────────

export const Disabled: Story = {
  args: {
    label: 'Disabled',
    variant: 'primary',
    size: 'default',
    disabled: true,
    isLoading: false,
    type: 'button',
  },
};

export const Invalid: Story = {
  args: {
    label: 'Button',
    variant: 'outline',
    size: 'default',
    invalid: true,
    disabled: false,
    isLoading: false,
    type: 'button',
  },
};

// ─── Custom classes ────────────────────────────────────────────────────────

export const CustomClass: Story = {
  args: {
    label: 'Full width',
    variant: 'primary',
    class: 'w-full !rounded-full',
  },
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
            <lib-ui-button variant="outline">Outline</lib-ui-button>
            <lib-ui-button variant="ghost">Ghost</lib-ui-button>
            <lib-ui-button variant="link">Link</lib-ui-button>
            <lib-ui-button variant="destructive">Destructive</lib-ui-button>
          </div>
        </div>

        <div>
          <p style="margin:0 0 10px; font-size:12px; color:#888; text-transform:uppercase; letter-spacing:.05em;">Sizes</p>
          <div style="display:flex; flex-wrap:wrap; gap:12px; align-items:center;">
            <lib-ui-button variant="primary" size="xs">Extra small</lib-ui-button>
            <lib-ui-button variant="primary" size="sm">Small</lib-ui-button>
            <lib-ui-button variant="primary" size="default">Default</lib-ui-button>
            <lib-ui-button variant="primary" size="lg">Large</lib-ui-button>
          </div>
        </div>

        <div>
          <p style="margin:0 0 10px; font-size:12px; color:#888; text-transform:uppercase; letter-spacing:.05em;">Disabled</p>
          <div style="display:flex; flex-wrap:wrap; gap:12px; align-items:center;">
            <lib-ui-button variant="primary" [disabled]="true">Primary</lib-ui-button>
            <lib-ui-button variant="secondary" [disabled]="true">Secondary</lib-ui-button>
            <lib-ui-button variant="outline" [disabled]="true">Outline</lib-ui-button>
            <lib-ui-button variant="ghost" [disabled]="true">Ghost</lib-ui-button>
            <lib-ui-button variant="destructive" [disabled]="true">Destructive</lib-ui-button>
          </div>
        </div>

        <div>
          <p style="margin:0 0 10px; font-size:12px; color:#888; text-transform:uppercase; letter-spacing:.05em;">Invalid</p>
          <div style="display:flex; flex-wrap:wrap; gap:12px; align-items:center;">
            <lib-ui-button variant="primary" [invalid]="true">Primary</lib-ui-button>
            <lib-ui-button variant="outline" [invalid]="true">Outline</lib-ui-button>
            <lib-ui-button variant="destructive" [invalid]="true">Destructive</lib-ui-button>
          </div>
        </div>

        <div>
          <p style="margin:0 0 10px; font-size:12px; color:#888; text-transform:uppercase; letter-spacing:.05em;">Loading</p>
          <div style="display:flex; flex-wrap:wrap; gap:12px; align-items:center;">
            <lib-ui-button variant="primary" [isLoading]="true" [disabled]="true">Saving</lib-ui-button>
            <lib-ui-button variant="secondary" [isLoading]="true" [disabled]="true">Loading</lib-ui-button>
            <lib-ui-button variant="destructive" [isLoading]="true" [disabled]="true">Deleting</lib-ui-button>
          </div>
        </div>

        <div>
          <p style="margin:0 0 10px; font-size:12px; color:#888; text-transform:uppercase; letter-spacing:.05em;">With icons</p>
          <div style="display:flex; flex-wrap:wrap; gap:12px; align-items:center;">
            <lib-ui-button variant="primary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
              Download
            </lib-ui-button>
            <lib-ui-button variant="destructive">
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
