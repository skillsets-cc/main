import { useState, useEffect } from 'react';

const linkStyles = 'block text-base text-text-secondary hover:text-accent hover:underline transition-colors';

export default function AuthStatus() {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    fetch('/api/me')
      .then((res) => setLoggedIn(res.ok))
      .catch(() => setLoggedIn(false));
  }, []);

  if (!loggedIn) return null;

  return (
    <a href="/logout" className={linkStyles}>
      Log out
    </a>
  );
}
