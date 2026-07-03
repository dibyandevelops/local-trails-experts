'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { useEffect, useState } from 'react';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebase';

type PhoneVerificationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phone: string;
  onVerified: (idToken: string) => Promise<void> | void;
};

const RESEND_SECONDS = 30;

export default function PhoneVerificationDialog({
  open,
  onOpenChange,
  phone,
  onVerified,
}: PhoneVerificationDialogProps) {
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (!open) {
      setOtp('');
      setError(null);
      setConfirmationResult(null);
      setCooldown(0);
    }
  }, [open]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const sendOtp = async () => {
    setError(null);
    if (!phone.trim()) {
      setError('Please enter a valid phone number.');
      return;
    }

    setSending(true);
    try {
      const auth = getFirebaseAuth();
      const verifier =
        (window as any).recaptchaVerifier ||
        new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible',
        });
      (window as any).recaptchaVerifier = verifier;
      const result = await signInWithPhoneNumber(auth, phone.trim(), verifier);
      setConfirmationResult(result);
      setCooldown(RESEND_SECONDS);
    } catch (err) {
      console.error('OTP send failed', err);
      setError('Failed to send OTP. Check the phone number.');
    } finally {
      setSending(false);
    }
  };

  const verifyOtp = async () => {
    setError(null);
    if (!otp || !confirmationResult) {
      setError('Enter the OTP you received.');
      return;
    }
    setVerifying(true);
    try {
      const credential = await confirmationResult.confirm(otp);
      const idToken = await credential.user.getIdToken();
      await onVerified(idToken);
      onOpenChange(false);
    } catch (err) {
      console.error('OTP verify failed', err);
      setError('Invalid OTP. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-lg">
          <Dialog.Title className="text-lg font-semibold text-gray-900">
            Verify Phone Number
          </Dialog.Title>
          <Dialog.Description className="text-sm text-gray-600 mt-1">
            We will send a verification code to {phone || 'your phone'}.
          </Dialog.Description>

          <div id="recaptcha-container" />

          <div className="mt-4 space-y-3">
            <button
              type="button"
              onClick={sendOtp}
              disabled={sending || cooldown > 0}
              className="w-full rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-60"
            >
              {sending
                ? 'Sending...'
                : cooldown > 0
                ? `Resend in ${cooldown}s`
                : confirmationResult
                ? 'Resend OTP'
                : 'Send OTP'}
            </button>

            {confirmationResult && (
              <div className="space-y-2">
                <label htmlFor="phone-verification-otp" className="block text-sm font-medium text-gray-700">
                  OTP Code
                </label>
                <input
                  id="phone-verification-otp"
                  name="otp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  type="text"
                  value={otp}
                  onChange={(event) => setOtp(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  placeholder="123456"
                />
                <button
                  type="button"
                  onClick={verifyOtp}
                  disabled={verifying}
                  className="w-full rounded-lg border border-green-700 px-4 py-2 text-sm font-semibold text-green-700 hover:bg-green-50 disabled:opacity-60"
                >
                  {verifying ? 'Verifying...' : 'Verify OTP'}
                </button>
              </div>
            )}
          </div>

          {error && (
            <p role="alert" className="mt-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="mt-4 flex justify-end">
            <Dialog.Close asChild>
              <button
                type="button"
                className="text-sm font-semibold text-gray-500 hover:text-gray-700"
              >
                Close
              </button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
