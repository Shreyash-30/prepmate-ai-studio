import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  element: React.ReactElement;
  permitPublic?: boolean;
}

export function ProtectedRoute({ element, permitPublic = false }: ProtectedRouteProps) {
  const token = localStorage.getItem('auth_token');
  const hasToken = Boolean(token && token.trim());

  // If route permits public access and user has token, allow
  if (permitPublic) {
    return element;
  }

  // If token exists, allow access
  if (hasToken) {
    return element;
  }

  // No token, redirect to login
  return <Navigate to="/login" replace />;
}

export function PublicRoute({ element }: { element: React.ReactElement }) {
  const token = localStorage.getItem('auth_token');
  const hasToken = Boolean(token && token.trim());

  // If user has token, redirect to dashboard
  if (hasToken) {
    return <Navigate to="/dashboard" replace />;
  }

  // Allow public access
  return element;
}
