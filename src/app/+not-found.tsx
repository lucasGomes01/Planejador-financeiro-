import { Redirect } from 'expo-router';
import { useAuth } from '../context/AuthContext';

/** Unknown or not-allowed routes go to the right starting screen. */
export default function NotFound() {
  const { session, needsMfa } = useAuth();
  if (!session) return <Redirect href="/login" />;
  if (needsMfa) return <Redirect href="/mfa" />;
  return <Redirect href="/" />;
}
