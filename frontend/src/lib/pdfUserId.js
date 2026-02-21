/**
 * User Email management utility
 * Stores user email in localStorage and sends it with requests
 */

const USER_EMAIL_KEY = 'pdf_compression_user_email';

export const getUserEmail = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(USER_EMAIL_KEY);
};

export const setUserEmail = (email) => {
  if (typeof window === 'undefined') return;
  // Normalize email (lowercase, trim)
  const normalizedEmail = email.toLowerCase().trim();
  localStorage.setItem(USER_EMAIL_KEY, normalizedEmail);
};

export const clearUserEmail = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(USER_EMAIL_KEY);
};

export const ensureUserEmail = () => {
  return getUserEmail();
};

