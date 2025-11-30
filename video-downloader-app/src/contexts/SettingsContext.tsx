import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Theme = 'light' | 'dark' | 'auto' | 'high-contrast';
export type Language = 'en';
export type VideoQuality = '2160p' | '1440p' | '1080p' | '720p' | '480p' | '360p';
export type VideoFormat = 'mp4' | 'mp3';

export interface Settings {
  // Download Preferences
  defaultQuality: VideoQuality;
  defaultFormat: VideoFormat;
  autoGenerateTranscripts: boolean;

  // Interface Preferences
  theme: Theme;
  language: Language;
  compactView: boolean;

  // Advanced
  experimentalFeatures: boolean;
  developerMode: boolean;
}

interface SettingsContextType {
  settings: Settings;
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  resetSettings: () => void;
  clearAllData: () => Promise<void>;
  exportSettings: () => string;
  importSettings: (data: string) => boolean;
}

const defaultSettings: Settings = {
  // Download Preferences
  defaultQuality: '1080p',
  defaultFormat: 'mp4',
  autoGenerateTranscripts: false,

  // Interface Preferences
  theme: 'auto',
  language: 'en',
  compactView: false,

  // Advanced
  experimentalFeatures: false,
  developerMode: false,
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const STORAGE_KEY = 'video-downloader-settings';

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<Settings>(() => {
    // Load settings from localStorage
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const loadedSettings = { ...defaultSettings, ...parsed };
        console.log('[SettingsContext] Loaded settings from localStorage:', loadedSettings);
        return loadedSettings;
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
    console.log('[SettingsContext] Using default settings:', defaultSettings);
    return defaultSettings;
  });

  // Save settings to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }, [settings]);

  // Apply theme immediately on mount and when settings change
  useEffect(() => {
    const root = document.documentElement;

    const applyTheme = (theme: Theme) => {
      console.log('[SettingsContext] Applying theme:', theme);
      console.log('[SettingsContext] Current classList before:', root.classList.toString());

      // Remove all theme classes first
      root.classList.remove('dark', 'high-contrast');

      if (theme === 'dark') {
        root.classList.add('dark');
        console.log('[SettingsContext] Added "dark" class');
        console.log('[SettingsContext] Current classList after:', root.classList.toString());
      } else if (theme === 'high-contrast') {
        root.classList.add('high-contrast');
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
          root.classList.add('dark');
        }
        console.log('[SettingsContext] Applied high-contrast theme');
        console.log('[SettingsContext] Current classList after:', root.classList.toString());
      } else if (theme === 'auto') {
        // Auto mode - use system preference
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const applyAutoTheme = () => {
          root.classList.remove('dark');
          if (mediaQuery.matches) {
            root.classList.add('dark');
            console.log('[SettingsContext] Auto mode: System prefers dark');
          } else {
            console.log('[SettingsContext] Auto mode: System prefers light');
          }
          console.log('[SettingsContext] Current classList after auto:', root.classList.toString());
        };

        applyAutoTheme(); // Apply immediately

        const handler = () => {
          applyAutoTheme();
        };
        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
      } else {
        // 'light' theme - ensure dark is removed
        console.log('[SettingsContext] Applied light theme');
        console.log('[SettingsContext] Current classList after:', root.classList.toString());
      }
    };

    const cleanup = applyTheme(settings.theme);
    return cleanup;
  }, [settings.theme]);

  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    console.log(`[SettingsContext] Updating setting: ${String(key)} =`, value);
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
  };

  const clearAllData = async () => {
    try {
      // Clear all localStorage
      localStorage.clear();

      // Clear IndexedDB
      const databases = await window.indexedDB.databases();
      for (const db of databases) {
        if (db.name) {
          window.indexedDB.deleteDatabase(db.name);
        }
      }

      // Reset settings to defaults
      setSettings(defaultSettings);

      // Reload the page to ensure clean state
      window.location.reload();
    } catch (error) {
      console.error('Failed to clear all data:', error);
      throw error;
    }
  };

  const exportSettings = () => {
    return JSON.stringify(settings, null, 2);
  };

  const importSettings = (data: string): boolean => {
    try {
      const parsed = JSON.parse(data);
      // Validate that it has the right structure
      if (typeof parsed === 'object' && parsed !== null) {
        setSettings({ ...defaultSettings, ...parsed });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to import settings:', error);
      return false;
    }
  };

  const value: SettingsContextType = {
    settings,
    updateSetting,
    resetSettings,
    clearAllData,
    exportSettings,
    importSettings,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
