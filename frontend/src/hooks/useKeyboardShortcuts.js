import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/** Global keyboard shortcuts for power users */
export function useKeyboardShortcuts() {
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'd':
            e.preventDefault();
            navigate('/');
            break;
          case 'f':
            e.preventDefault();
            navigate('/search');
            break;
          case 'o':
            e.preventDefault();
            navigate('/organizer');
            break;
          case 'k':
            e.preventDefault();
            navigate('/chat');
            break;
          default:
            break;
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate]);
}
