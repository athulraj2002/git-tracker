import type { Meta, StoryObj } from '@storybook/angular';
import { Select, SelectSize } from './select';

const RANGE_OPTIONS = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: '365d', label: 'Last 12 months' },
];

const meta: Meta<Select> = {
  title: 'UI/Select',
  component: Select,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['xs', 'sm', 'default', 'lg'] satisfies SelectSize[],
      description: 'Height/radius scale of the select',
      table: {
        defaultValue: { summary: 'default' },
      },
    },
    invalid: {
      control: 'boolean',
      description: 'Shows the error-state border/ring',
      table: {
        defaultValue: { summary: 'false' },
      },
    },
    disabled: {
      control: 'boolean',
      description: 'Disables the select',
      table: {
        defaultValue: { summary: 'false' },
      },
    },
  },
  render: (args) => ({
    props: args,
    template: `<lib-ui-select [options]="options" [value]="value" [size]="size" [invalid]="invalid" [disabled]="disabled"></lib-ui-select>`,
  }),
};

export default meta;
type Story = StoryObj<Select>;

export const Default: Story = {
  args: {
    options: RANGE_OPTIONS,
    value: '30d',
    size: 'default',
    invalid: false,
    disabled: false,
  },
};

export const Sizes: Story = {
  render: () => ({
    template: `
      <div style="display:flex; gap:12px; align-items:center; padding:24px; font-family:sans-serif;">
        <lib-ui-select [options]="[{value:'a',label:'Extra small'}]" value="a" size="xs"></lib-ui-select>
        <lib-ui-select [options]="[{value:'a',label:'Small'}]" value="a" size="sm"></lib-ui-select>
        <lib-ui-select [options]="[{value:'a',label:'Default'}]" value="a" size="default"></lib-ui-select>
        <lib-ui-select [options]="[{value:'a',label:'Large'}]" value="a" size="lg"></lib-ui-select>
      </div>
    `,
  }),
};

export const Invalid: Story = {
  args: {
    options: RANGE_OPTIONS,
    value: '30d',
    invalid: true,
  },
};

export const Disabled: Story = {
  args: {
    options: RANGE_OPTIONS,
    value: '30d',
    disabled: true,
  },
};

export const WithCustomWidth: Story = {
  render: (args) => ({
    props: args,
    template: `<lib-ui-select [options]="options" [value]="value" [class]="'max-w-40'"></lib-ui-select>`,
  }),
  args: {
    options: [
      { value: 'all', label: 'All repositories' },
      { value: 'repo-1', label: 'org/frontend' },
      { value: 'repo-2', label: 'org/backend' },
    ],
    value: 'all',
  },
};
