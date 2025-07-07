import { useState } from 'react';
import { Button } from './button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from './dropdown-menu';

/**
 * LanguageSwitcher component that allows users to switch between different languages
 * Supports English, Bangla, and Arabic with appropriate text direction
 */
export function LanguageSwitcher() {
    const [open, setOpen] = useState(false);
  
  const languageOptions = [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
    { code: 'ar', name: 'Arabic', nativeName: 'العربية' }
  ];
  
  // Get current language display name
  const currentLanguage = languageOptions.find(lang => lang.code === language);
  
  const handleLanguageChange = (langCode) => {
    setLanguage(langCode);
    setOpen(false);
  };
  
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="flex items-center gap-1.5 h-9 px-3"
        >
          <span className="text-base mr-1">
            {language === 'ar' ? '🇸🇦' : language === 'bn' ? '🇧🇩' : '🇬🇧'}
          </span>
          <span>{currentLanguage?.nativeName}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[160px]">
        {languageOptions.map(({ code, name, nativeName }) => (
          <DropdownMenuItem
            key={code}
            onClick={() => handleLanguageChange(code)}
            className={language === code ? 'bg-secondary' : ''}
          >
            <span className="text-base mr-2">
              {code === 'ar' ? '🇸🇦' : code === 'bn' ? '🇧🇩' : '🇬🇧'}
            </span>
            <span className="flex-1">{nativeName}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}