import { redirect } from 'next/navigation';

export default function AuthLoginRedirect() {
  // Backwards-compat redirect for old links that point to /auth/login
  redirect('/login');
}