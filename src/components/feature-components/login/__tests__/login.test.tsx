// Import testing utilities from React Testing Library
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
// Import React Query client and provider for managing server state
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// Import React types
import type { ReactElement } from 'react';
// Import the LoginComponent to test
import LoginComponent from '@/components/feature-components/login';
// Import the loginUser service function to mock
import { loginUser } from '@/services/auth/auth.service';

// Create a mock function for the router's push method
const pushMock = vi.fn();

// Mock the Next.js navigation module to control routing behavior
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
  useSearchParams: () => ({
    get: vi.fn(() => null),
  }),
}));

// Mock the auth service while preserving other exports
vi.mock('@/services/auth/auth.service', async () => {
  const actual = await vi.importActual('@/services/auth/auth.service');
  return {
    ...actual,
    loginUser: vi.fn(),
  };
});

// Get the mocked loginUser function for setting expectations
const loginUserMock = vi.mocked(loginUser);
const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'dibyan.softwaredev@gmail.com';

// Helper function to render components with QueryClientProvider wrapper
function renderWithQuery(ui: ReactElement) {
  // Create a QueryClient instance with retry disabled for faster tests
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  // Wrap component with QueryClientProvider and return render result
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

// Test suite for LoginComponent
describe('LoginComponent', () => {
  // Reset all mocks before each test
  beforeEach(() => {
    pushMock.mockReset();
    loginUserMock.mockReset();
  });

  // Test that validation errors appear when no credentials are provided
  it('shows validation error for missing credentials with accessible alert', async () => {
    renderWithQuery(<LoginComponent />);
    // Click the login button without filling any fields
    fireEvent.click(screen.getByRole('button', { name: /login/i }));
    // Verify error alert appears with correct message
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/please enter your email and password/i);
    expect(alert).toHaveAttribute('id', 'login-error');
  });

  // Test that form controls have proper accessibility attributes
  it('has accessible form controls', () => {
    renderWithQuery(<LoginComponent />);
    // Get form inputs by their labels
    const roleGroup = screen.getByRole('radiogroup', { name: /role/i });
    const participantRole = screen.getByRole('radio', { name: /participant/i });
    const expertRole = screen.getByRole('radio', { name: /expert/i });
    const adminRole = screen.getByRole('radio', { name: /admin/i });
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    // Verify controls exist and have required accessibility attributes
    expect(roleGroup).toBeInTheDocument();
    expect(participantRole).toHaveAttribute('aria-checked', 'true');
    expect(expertRole).toHaveAttribute('aria-checked', 'false');
    expect(adminRole).toHaveAttribute('aria-checked', 'false');
    expect(emailInput).toHaveAttribute('required');
    expect(emailInput).toHaveAttribute('autocomplete', 'email');
    expect(passwordInput).toHaveAttribute('required');
    expect(passwordInput).toHaveAttribute('autocomplete', 'current-password');
  });

  // Test that admin users are redirected to admin dashboard after login
  it('redirects admin user after successful login', async () => {
    // Mock successful login response
    loginUserMock.mockResolvedValue({ user: { id: 'admin-123' } });
    // Spy on window events to verify custom events are dispatched
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

    renderWithQuery(<LoginComponent />);

    // Fill in the login form with admin credentials
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: ADMIN_EMAIL },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: '1MicroPassword' },
    });
    fireEvent.click(screen.getByRole('radio', { name: /admin/i }));

    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    // Verify login was called with correct data and user was redirected
    await waitFor(() => {
      expect(loginUserMock).toHaveBeenCalled();
      expect(loginUserMock.mock.calls[0][0]).toEqual({
        email: ADMIN_EMAIL,
        role: 'admin',
        password: '1MicroPassword',
      });
      expect(pushMock).toHaveBeenCalledWith('/admin');
      expect(dispatchSpy).toHaveBeenCalled();
    });
  });

  // Test that participant users are redirected to trails page after login
  it('redirects participant user after successful login', async () => {
    // Mock successful login response for participant
    loginUserMock.mockResolvedValue({ user: { id: 'participant-123' } });

    renderWithQuery(<LoginComponent />);

    // Fill in the login form with participant credentials
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'participant@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'Pass12345' },
    });
    fireEvent.click(screen.getByRole('radio', { name: /participant/i }));

    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    // Verify participant is redirected to trails page
    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/trails');
    });
  });

  // Test that API error messages are displayed to the user
  it('shows API error message when login fails', async () => {
    // Mock a failed login response
    loginUserMock.mockRejectedValue(new Error('Invalid credentials'));

    renderWithQuery(<LoginComponent />);

    // Fill in the login form with invalid credentials
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'bad@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'wrongpass1' },
    });
    fireEvent.click(screen.getByRole('radio', { name: /participant/i }));

    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    // Verify error message is shown and user is not redirected
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /invalid credentials/i
    );
    expect(pushMock).not.toHaveBeenCalled();
  });

  // Test that submit button is disabled and shows loading state during login
  it('disables submit and shows loading state while mutation is pending', async () => {
    // Create a promise that can be resolved later to simulate pending login
    let resolveLogin: ((value: { user: { id: string } }) => void) | null = null;
    loginUserMock.mockReturnValue(
      new Promise((resolve) => {
        resolveLogin = resolve;
      }) as ReturnType<typeof loginUser>
    );

    renderWithQuery(<LoginComponent />);

    // Fill in the login form
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'expert@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'Pass12345' },
    });
    fireEvent.click(screen.getByRole('radio', { name: /expert/i }));

    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    // Verify button is disabled and shows loading state
    await waitFor(() => {
      const loadingButton = screen.getByRole('button', { name: /signing in/i });
      expect(loadingButton).toBeDisabled();
    });

    // @ts-ignore
    // Resolve the pending login
    resolveLogin?.({ user: { id: 'expert-123' } });

    // Verify expert is redirected to their profile page
    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/experts/expert-123');
    });
  });
});
