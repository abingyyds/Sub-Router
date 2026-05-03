const parseCustomConfig = (raw) => {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (e) {
    return {};
  }
};

const firstText = (...values) => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return '';
};

export function getHomeContent(site, t) {
  const config = parseCustomConfig(site?.custom_config);
  const home = config.home && typeof config.home === 'object' ? config.home : {};

  return {
    heroTagline: firstText(
      home.heroTagline,
      home.hero_tagline,
      config.heroTagline,
      config.hero_tagline,
      t('home.heroTagline'),
    ),
    heroSubtitle: firstText(
      home.heroSubtitle,
      home.hero_subtitle,
      config.heroSubtitle,
      config.hero_subtitle,
      t('home.heroSubtitle'),
    ),
    heroImage: firstText(
      home.heroImage,
      home.hero_image,
      home.heroImageUrl,
      home.hero_image_url,
      config.heroImage,
      config.hero_image,
      config.heroImageUrl,
      config.hero_image_url,
    ),
  };
}
