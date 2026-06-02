import type { Meta, StoryObj } from '@storybook/react';
import { TrailFilterChip } from './trail-filter-chip';

const meta = {
  title: 'Trails/Filter Chip',
  component: TrailFilterChip,
  parameters: {
    layout: 'centered',
  },
  args: {
    children: 'Difficulty: Moderate',
    tone: 'blue',
    onRemove: () => undefined,
  },
} satisfies Meta<typeof TrailFilterChip>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const ActiveFilters: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <TrailFilterChip tone="green" onRemove={() => undefined}>
        Search: pharphing
      </TrailFilterChip>
      <TrailFilterChip tone="blue" onRemove={() => undefined}>
        Difficulty: Moderate
      </TrailFilterChip>
      <TrailFilterChip tone="amber" onRemove={() => undefined}>
        Sport: MTB
      </TrailFilterChip>
      <TrailFilterChip tone="slate" onRemove={() => undefined}>
        Sort: Distance
      </TrailFilterChip>
    </div>
  ),
};
