import { useEffect } from "react";

export function useKeyboardShortcuts(
  shortcuts: {
    key: string;
    ctrl?: boolean;
    alt?: boolean;
    shift?: boolean;
    action: () => void;
  }[]
) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = shortcut.ctrl ? e.ctrlKey || e.metaKey : !e.ctrlKey && !e.metaKey;
        const altMatch = shortcut.alt ? e.altKey : !e.altKey;
        const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;

        if (keyMatch && ctrlMatch && altMatch && shiftMatch) {
          // Solo prevenir default para Ctrl+K (buscador global)
          if (shortcut.ctrl && shortcut.key.toLowerCase() === 'k') {
            e.preventDefault();
          }
          shortcut.action();
          return;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts]);
}
