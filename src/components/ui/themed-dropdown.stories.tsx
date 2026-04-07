import type { Meta, StoryObj } from '@storybook/react';
import ThemedDropdown from './themed-dropdown';

const action = () => undefined;

const meta = {
  title: 'UI/ThemedDropdown',
  component: ThemedDropdown,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ThemedDropdown>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: 'Trail Actions',
    items: [
      { label: 'View trail details', onSelect: action },
      { label: 'Create event', onSelect: action },
      { label: 'Edit trail', onSelect: action },
      { label: 'Delete trail', onSelect: action, disabled: true },
    ],
  },
};

export const WithLinks: Story = {
  args: {
    label: 'Navigate',
    items: [
      { label: 'Explore trails', href: '/trails' },
      { label: 'Events', href: '/events' },
      { label: 'Experts', href: '/experts' },
    ],
  },
};
