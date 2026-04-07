import '../src/app/globals.css';

const preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'app-light',
      values: [
        { name: 'app-light', value: '#f8fafc' },
        { name: 'app-dark', value: '#0f172a' },
      ],
    },
    layout: 'centered',
  },
};

export default preview;
