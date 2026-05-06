import type { Meta, StoryObj } from '@storybook/angular';
import { Spinner } from './spinner';

const meta: Meta<Spinner> = {
  component: Spinner,
  title: 'UI/Spinner',
};
export default meta;

type Story = StoryObj<Spinner>;

export const Primary: Story = {
  args: {},
};
