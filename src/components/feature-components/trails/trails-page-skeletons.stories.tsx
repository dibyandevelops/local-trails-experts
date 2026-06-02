import type { Meta, StoryObj } from '@storybook/react';
import { TrailsPageSkeleton, TrailsLoadMoreSkeleton } from './trails-page-skeletons';

const meta = {
  title: 'Trails/Loading Skeletons',
  component: TrailsPageSkeleton,
  tags: ['autodocs'],
} satisfies Meta<typeof TrailsPageSkeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const InitialPage: Story = {};

export const LoadMore: Story = {
  render: () => <TrailsLoadMoreSkeleton />,
};
