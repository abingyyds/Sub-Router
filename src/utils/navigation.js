export function getSiteNavItems({ t, site }) {
  return [
    { to: '/', label: t('nav.home'), auth: false },
    { to: '/pricing', label: t('nav.pricing'), auth: false },
    { to: '/packages', label: t('nav.packages'), auth: false },
    { to: '/apps', label: t('nav.apps'), auth: false },
    ...(site?.allow_sub_dist
      ? [{ to: '/sub-site', label: t('subDist.nav'), auth: false }]
      : []),
    { to: '/dashboard', label: t('nav.dashboard'), auth: true },
    { to: '/tokens', label: t('nav.apiKeys'), auth: true },
    { to: '/logs', label: t('nav.logs'), auth: true },
    ...(site?.enable_topup
      ? [{ to: '/topup', label: t('nav.topup'), auth: true }]
      : []),
    { to: '/account', label: t('nav.account'), auth: true },
  ];
}

export function getVisibleNavItems(navItems, user) {
  return navItems.filter((item) => !item.auth || user);
}

export function isSiteNavActive(pathname, to) {
  return pathname === to || (to === '/logs' && pathname === '/tasks');
}
