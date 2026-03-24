import '@testing-library/jest-dom/vitest';

// Prevent jsdom "navigation not implemented" errors when components render next/link.
// We keep the href for assertions, but block the actual navigation side-effect.
import React from 'react';
import { vi } from 'vitest';

vi.mock('next/link', () => {
  return {
    __esModule: true,
    default: ({
      href,
      onClick,
      children,
      ...rest
    }: {
      href: any;
      onClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void;
      children: React.ReactNode;
      [key: string]: any;
    }) => {
      const resolvedHref =
        typeof href === 'string'
          ? href
          : typeof href?.pathname === 'string'
            ? href.pathname
            : '/';
      return React.createElement(
        'a',
        {
          href: resolvedHref,
          ...rest,
          onClick: (event: React.MouseEvent<HTMLAnchorElement>) => {
            onClick?.(event);
            event.preventDefault();
          },
        },
        children
      );
    },
  };
});
