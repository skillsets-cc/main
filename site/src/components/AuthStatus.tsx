import { useState, useEffect } from 'react';

export default function AuthStatus() {
  const [login, setLogin] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch('/api/me')
      .then((res) => {
        if (res.ok) return res.json();
        return null;
      })
      .then((data) => {
        if (data?.login) setLogin(data.login);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  if (!loaded) return null;

  if (login) {
    return (
      <div className="text-sm">
        <span className="text-text-secondary">@{login}</span>
        <span className="text-text-tertiary mx-1">·</span>
        <a
          href="/logout"
          className="text-text-secondary hover:text-orange-500 hover:underline transition-colors"
        >
          Logout
        </a>
      </div>
    );
  }

  return (
    <a
      href={`/login?returnTo=${encodeURIComponent(window.location.pathname)}`}
      className="text-sm text-text-secondary hover:text-orange-500 hover:underline transition-colors"
    >
      Login
    </a>
  );
}
