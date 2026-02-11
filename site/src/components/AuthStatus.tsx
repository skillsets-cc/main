import { useState, useEffect } from 'react';

export default function AuthStatus() {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    fetch('/api/me')
      .then((res) => setLoggedIn(res.ok))
      .catch(() => setLoggedIn(false));
  }, []);

  if (loggedIn === null) return null;

  if (loggedIn) {
    return (
      <a
        href="/logout"
        className="block text-base text-text-secondary hover:text-orange-500 hover:underline transition-colors"
      >
        Log out
      </a>
    );
  }

  return (
    <a
      href={`/login?returnTo=${encodeURIComponent(window.location.pathname)}`}
      className="block text-base text-text-secondary hover:text-orange-500 hover:underline transition-colors"
    >
      Log in
    </a>
  );
}
