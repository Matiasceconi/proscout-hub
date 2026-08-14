import { useEffect } from 'react';

const DEFAULT_TITLE = 'Plataforma de gestión';
const DEFAULT_THEME_COLOR = '#0F172A';

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
    const organizationName = org?.name?.trim();
    const label = contextLabel?.trim();

    document.title = organizationName
      ? [organizationName, label].filter(Boolean).join(' · ')
      : DEFAULT_TITLE;

    const themeMeta = getOrCreateThemeMeta();
    themeMeta.content = org?.primary_color || DEFAULT_THEME_COLOR;

    let favicon = document.querySelector('link[data-organization-branding="true"]');
    if (org?.logo_url) {
      if (!favicon) {
        favicon = document.createElement('link');
        favicon.rel = 'icon';
        favicon.dataset.organizationBranding = 'true';
        document.head.appendChild(favicon);
      }
      favicon.href = org.logo_url;
    } else if (favicon) {
      favicon.remove();
    }

    return () => {
      document.title = DEFAULT_TITLE;
      themeMeta.content = DEFAULT_THEME_COLOR;
      document.querySelector('link[data-organization-branding="true"]')?.remove();
    };
  }, [org?.name, org?.logo_url, org?.primary_color, contextLabel]);
}
