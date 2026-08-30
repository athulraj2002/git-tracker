import type { Meta, StoryObj } from '@storybook/angular';
import { ButtonGroup } from './button-group';

const meta: Meta<ButtonGroup> = {
  title: 'UI/ButtonGroup',
  component: ButtonGroup,
  tags: ['autodocs'],
  render: (args) => ({
    props: args,
    template: `<lib-ui-button-group [options]="options" [value]="value"></lib-ui-button-group>`,
  }),
};

export default meta;
type Story = StoryObj<ButtonGroup>;

export const Default: Story = {
  args: {
    options: [
      { value: 'bar', label: 'Bars' },
      { value: 'heatmap', label: 'Heatmap' },
    ],
    value: 'bar',
  },
};

export const ThreeOptions: Story = {
  args: {
    options: [
      { value: 'day', label: 'Day' },
      { value: 'week', label: 'Week' },
      { value: 'month', label: 'Month' },
    ],
    value: 'week',
  },
};
