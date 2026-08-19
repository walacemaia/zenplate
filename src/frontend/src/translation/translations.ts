import { useState, useEffect } from 'react';

import { useIcpContext } from 'src/auth/context/icp/icp-context-provider';

const TRANSLATION_KEY = 'app_translations';
const VERSION_KEY = 'app_translation_version';

export const useTranslations = (lang: string) => {
  const [translations, setTranslations] = useState<{ [key: string]: string }>({});

  const { backend } = useIcpContext();

  useEffect(() => {
    const loadTranslations = async () => {
      const cachedTranslations = localStorage.getItem(TRANSLATION_KEY);
      const cachedVersion = localStorage.getItem(VERSION_KEY);

      try {
        //const serverVersion = await backend.getVersion();
        const serverVersion = 14;
        // const response = await fetch(`${API_URL}?lang=${lang}`);
        // const [serverVersion, serverTranslations] = await response.json();

        if (cachedTranslations && cachedVersion === String(serverVersion)) {
          // Usa as traduções do cache se a versão for a mesma
          setTranslations(JSON.parse(cachedTranslations));
        } else {
          // Atualiza o cache com as novas traduções
          const serverTranslations = await backend.getTranslations();
          const translationMap = Object.fromEntries(serverTranslations);
          localStorage.setItem(TRANSLATION_KEY, JSON.stringify(translationMap));
          localStorage.setItem(VERSION_KEY, String(serverVersion));
          setTranslations(translationMap);
        }
      } catch (error) {
        console.error('Erro ao buscar traduções:', error);
        if (cachedTranslations) {
          setTranslations(JSON.parse(cachedTranslations));
        }
      }
    };

    loadTranslations();
  }, [lang, backend]);

  return (key: string) => translations[key] || key;
};
