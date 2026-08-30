import type { Meta, StoryObj } from '@storybook/angular';
import { Select } from './select';

const meta: Meta<Select> = {
  title: 'UI/Select',
  component: Select,
  tags: ['autodocs'],
  render: (args) => ({
    props: args,
    template: `<lib-ui-select [options]="options" [value]="value"></lib-ui-select>`,
  }),
};

export default meta;
type Story = StoryObj<Select>;

export const Default: Story = {
  args: {
    options: [
      { value: '7d', label: 'Last 7 days' },
      { value: '30d', label: 'Last 30 days' },
      { value: '90d', label: 'Last 90 days' },
      { value: '365d', label: 'Last 12 months' },
    ],
    value: '30d',
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
