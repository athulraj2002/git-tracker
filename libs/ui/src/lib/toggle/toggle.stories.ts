import type { Meta, StoryObj } from '@storybook/angular';
import { Toggle } from './toggle';

const meta: Meta<Toggle> = {
  title: 'UI/Toggle',
  component: Toggle,
  tags: ['autodocs'],
  render: (args) => ({
    props: args,
    template: `<lib-ui-toggle [checked]="checked" [disabled]="disabled" [label]="label"></lib-ui-toggle>`,
  }),
};

export default meta;
type Story = StoryObj<Toggle>;

export const Off: Story = {
  args: {
    checked: false,
    disabled: false,
    label: 'Track this repository',
  },
};

export const On: Story = {
  args: {
    checked: true,
    disabled: false,
    label: 'Track this repository',
  },
};

export const Disabled: Story = {
  args: {
    checked: true,
    disabled: true,
    label: 'Track this repository',
  },
};
