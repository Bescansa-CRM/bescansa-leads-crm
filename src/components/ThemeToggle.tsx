"use client";

declare global {
  interface Window {
    bescansaToggleTheme?: () => void;
  }
}

export function ThemeToggle() {
  return (
    <button type="button" className="btn btn-secondary btn-sm" onClick={() => window.bescansaToggleTheme?.()}>
      🌓 Tema
    </button>
  );
}
