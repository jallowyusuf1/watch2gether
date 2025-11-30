import { useSettings } from '../contexts/SettingsContext';

/**
 * Custom hook for theme management
 * Provides current theme and function to change it
 */
export const useTheme = () => {
  const { settings, updateSetting } = useSettings();

  const currentTheme = settings.theme;
  
  const setTheme = (theme: 'light' | 'dark' | 'auto' | 'high-contrast') => {
    updateSetting('theme', theme);
  };

  const toggleTheme = () => {
    if (currentTheme === 'light') {
      setTheme('dark');
    } else if (currentTheme === 'dark') {
      setTheme('auto');
    } else if (currentTheme === 'auto') {
      setTheme('high-contrast');
    } else {
      setTheme('light');
    }
  };

  // Get effective theme (resolves 'auto' to actual theme)
  const effectiveTheme = currentTheme === 'auto'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : currentTheme;

  const isDark = effectiveTheme === 'dark' || (effectiveTheme === 'high-contrast' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  return {
    theme: currentTheme,
    effectiveTheme,
    isDark,
    setTheme,
    toggleTheme,
  };
};

