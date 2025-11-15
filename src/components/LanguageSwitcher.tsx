import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Languages } from 'lucide-react';

const languages = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
];

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const { user } = useAuth();
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language);

  useEffect(() => {
    // Load user's language preference if logged in
    if (user) {
      fetchUserLanguage();
    }
  }, [user]);

  const fetchUserLanguage = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('language_preference')
        .eq('id', user?.id)
        .single();

      if (error) throw error;

      if (data?.language_preference) {
        await i18n.changeLanguage(data.language_preference);
        setCurrentLanguage(data.language_preference);
      }
    } catch (error) {
      console.error('Error fetching language preference:', error);
    }
  };

  const handleLanguageChange = async (languageCode: string) => {
    try {
      await i18n.changeLanguage(languageCode);
      setCurrentLanguage(languageCode);

      // Update user preference if logged in
      if (user) {
        const { error } = await supabase
          .from('profiles')
          .update({ language_preference: languageCode })
          .eq('id', user.id);

        if (error) throw error;
      }

      toast.success('Language updated');
    } catch (error) {
      console.error('Error changing language:', error);
      toast.error('Failed to update language');
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Languages className="h-4 w-4 text-muted-foreground" />
      <Select value={currentLanguage} onValueChange={handleLanguageChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue>
            {languages.find((l) => l.code === currentLanguage)?.flag}{' '}
            {languages.find((l) => l.code === currentLanguage)?.name}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {languages.map((language) => (
            <SelectItem key={language.code} value={language.code}>
              <span className="flex items-center gap-2">
                {language.flag} {language.name}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
