import type { Meta, StoryObj } from '@storybook/angular';
import { Dialog } from './dialog';

const meta: Meta<Dialog> = {
  title: 'UI/Dialog',
  component: Dialog,
  tags: ['autodocs'],
  render: (args) => ({
    props: args,
    template: `
      <lib-ui-dialog [open]="open" [title]="title">
        <p style="font-size:14px;color:#9ca3af;">This is the dialog's projected content.</p>
      </lib-ui-dialog>
    `,
  }),
};

export default meta;
type Story = StoryObj<Dialog>;

export const Default: Story = {
  args: {
    open: true,
    title: 'Dialog title',
  },
};

export const WideVariant: Story = {
  render: (args) => ({
    props: args,
    template: `
      <lib-ui-dialog [open]="open" [title]="title" [class]="'max-w-2xl'">
        <p style="font-size:14px;color:#9ca3af;">A wider panel via the class input.</p>
      </lib-ui-dialog>
    `,
  }),
  args: {
    open: true,
    title: 'Repository info',
  },
};
