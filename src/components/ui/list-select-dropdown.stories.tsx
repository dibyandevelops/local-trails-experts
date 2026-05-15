import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import ListSelectDropdown from './list-select-dropdown';

const meta: Meta<typeof ListSelectDropdown> = {
  title: 'UI/ListSelectDropdown',
  component: ListSelectDropdown,
};

export default meta;
type Story = StoryObj<typeof ListSelectDropdown>;

function DemoListSelectDropdown() {
  const [value, setValue] = useState('');
  return (
    <div className="max-w-sm p-6">
      <ListSelectDropdown
        label="Select expert"
        value={value}
        placeholder="Choose expert"
        options={[
          { value: '1', label: 'Dipendra Bajracharya' },
          { value: '2', label: 'Suman Gurung' },
          { value: '3', label: 'Niraj Shrestha' },
        ]}
        onChange={setValue}
      />
    </div>
  );
}

export const Default: Story = {
  render: () => <DemoListSelectDropdown />,
};
