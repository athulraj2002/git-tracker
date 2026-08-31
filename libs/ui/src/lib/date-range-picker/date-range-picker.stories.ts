import type { Meta, StoryObj } from '@storybook/angular';
import { DateRangePicker, toDateKey } from './date-range-picker';

const meta: Meta<DateRangePicker> = {
  title: 'UI/DateRangePicker',
  component: DateRangePicker,
  tags: ['autodocs'],
  render: (args) => ({
    props: args,
    template: `<lib-ui-date-range-picker [value]="value"></lib-ui-date-range-picker>`,
  }),
};

export default meta;
type Story = StoryObj<DateRangePicker>;

const today = new Date();
const weekStart = new Date(today);
weekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7));
const weekEnd = new Date(weekStart);
weekEnd.setDate(weekStart.getDate() + 6);

export const ThisWeek: Story = {
  args: {
    value: { start: toDateKey(weekStart), end: toDateKey(weekEnd) },
  },
};

export const SingleDay: Story = {
  args: {
    value: { start: toDateKey(today), end: toDateKey(today) },
  },
};
