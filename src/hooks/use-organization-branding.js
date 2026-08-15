import { useEffect } from 'react';
import { SCORE_FUTBOL_BRAND } from '@/lib/scoreFutbolBrand';

const DEFAULT_TITLE = SCORE_FUTBOL_BRAND.defaultTitle;
const DEFAULT_THEME_COLOR = SCORE_FUTBOL_BRAND.primaryColor;

function getOrCreateThemeMeta() {
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.appendChild(meta);
  }
  return meta;
}

export function useOrganizationBranding(org, contextLabel) {
  useEffect(() => {
    const label = contextLabel?.trim();
    document.title = [SCORE_FUTBOL_BRAND.name, label].filter(Boolean).join(' · ');

    const themeMeta = getOrCreateThemeMeta();
    themeMeta.content = org?.primary_color || DEFAULT_THEME_COLOR;

    let favicon = document.querySelector('link[data-organization-branding="true"]');
    const faviconUrl = org?.logo_url || SCORE_FUTBOL_BRAND.logoUrl;
    if (!favicon) {
      favicon = document.createElement('link');
      favicon.rel = 'icon';
      favicon.dataset.organizationBranding = 'true';
      document.head.appendChild(favicon);
    }
    favicon.href = faviconUrl;

    return () => {
      document.title = DEFAULT_TITLE;
      themeMeta.content = DEFAULT_THEME_COLOR;
      document.querySelector('link[data-organization-branding="true"]')?.remove();
    };
  }, [org?.logo_url, org?.primary_color, contextLabel]);
}
