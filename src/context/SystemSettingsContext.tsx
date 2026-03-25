import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../config/supabase';

interface SystemSettings {
  id: string;
  system_name: string;
  logo_url: string | null;
}

interface SystemSettingsContextData {
  settings: SystemSettings | null;
  loading: boolean;
  updateSettings: (name: string, logoUrl: string | null) => Promise<void>;
}

const SystemSettingsContext = createContext<SystemSettingsContextData>({} as SystemSettingsContextData);

export const SystemSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();

    // Subscribe to realtime changes
    const subscription = supabase
      .channel('public:system_settings')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'system_settings' },
        (payload) => {
          console.log('Realtime settings update:', payload);
          setSettings(payload.new as SystemSettings);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  // Effect to update document title and favicon
  useEffect(() => {
    if (settings) {
      document.title = settings.system_name || 'Sistema de Gestão';
      
      // Update Favicon
      if (settings.logo_url) {
        let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.getElementsByTagName('head')[0].appendChild(link);
        }
        link.href = settings.logo_url;
      }
    }
  }, [settings]);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .limit(1)
        .single();
      
      if (!error && data) {
        setSettings(data);
      }
    } catch (err) {
      console.error('Error fetching settings', err);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (name: string, logoUrl: string | null) => {
    if (!settings?.id) return;
    try {
      const { error } = await supabase
        .from('system_settings')
        .update({ system_name: name, logo_url: logoUrl, updated_at: new Date().toISOString() })
        .eq('id', settings.id);
        
      if (error) throw error;
      // Note: State might update automatically via Realtime, but optimism is good:
      setSettings(prev => prev ? { ...prev, system_name: name, logo_url: logoUrl } : null);
    } catch (err: any) {
      console.error('Failed to update settings:', err.message);
      throw err;
    }
  };

  return (
    <SystemSettingsContext.Provider value={{ settings, loading, updateSettings }}>
      {children}
    </SystemSettingsContext.Provider>
  );
};

export const useSystemSettings = () => useContext(SystemSettingsContext);
