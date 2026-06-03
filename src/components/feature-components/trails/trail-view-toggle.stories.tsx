/* eslint-disable react-hooks/rules-of-hooks */
import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { TrailViewToggle, type TrailsViewMode } from './trail-view-toggle';

const meta = {
  title: 'Trails/View Toggle',
  component: TrailViewToggle,
  tags: ['autodocs'],
  args: {
    value: 'grid',
    onChange: () => undefined,
  },
} satisfies Meta<typeof TrailViewToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => {
    const [value, setValue] = useState<TrailsViewMode>(args.value ?? 'grid');
    return <TrailViewToggle value={value} onChange={setValue} />;
  },
};
