/**
 * Safe client-side proxy for sending verification emails.
 * Calls our secure server API route to protect secret API keys.
 */
export const sendVerificationEmail = async (email: string, confirmationUrl: string) => {
  const response = await fetch('/api/auth/send-verification', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, confirmationUrl }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to trigger verification email securely.');
  }

  return response.json();
};
