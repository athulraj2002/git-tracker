import type { Meta, StoryObj } from '@storybook/angular';
import { ButtonGroup, ButtonGroupSize } from './button-group';

const meta: Meta<ButtonGroup> = {
  title: 'UI/ButtonGroup',
  component: ButtonGroup,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['xs', 'sm', 'default', 'lg'] satisfies ButtonGroupSize[],
      description: 'Height/padding scale of each segment',
      table: {
        defaultValue: { summary: 'sm' },
      },
    },
  },
  render: (args) => ({
    props: args,
    template: `<lib-ui-button-group [options]="options" [value]="value" [size]="size"></lib-ui-button-group>`,
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
    size: 'sm',
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
    size: 'sm',
  },
};

export const Sizes: Story = {
  render: () => ({
    template: `
      <div style="display:flex; flex-direction:column; gap:16px; align-items:flex-start; padding:24px; font-family:sans-serif;">
        <lib-ui-button-group [options]="[{value:'a',label:'Bars'},{value:'b',label:'Heatmap'}]" value="a" size="xs"></lib-ui-button-group>
        <lib-ui-button-group [options]="[{value:'a',label:'Bars'},{value:'b',label:'Heatmap'}]" value="a" size="sm"></lib-ui-button-group>
        <lib-ui-button-group [options]="[{value:'a',label:'Bars'},{value:'b',label:'Heatmap'}]" value="a" size="default"></lib-ui-button-group>
        <lib-ui-button-group [options]="[{value:'a',label:'Bars'},{value:'b',label:'Heatmap'}]" value="a" size="lg"></lib-ui-button-group>
      </div>
    `,
  }),
};
