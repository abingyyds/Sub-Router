export function getSiteNavItems({ t, site }) {
  const showAppMarket = site?.show_app_market !== false;
  const fullMode = site?.full_mode === true || site?.display_mode === "full";
  const showOfficialChannels =
    site?.show_official_channels !== false && site?.has_official_channels;
  const showSharedSubscriptions = site?.show_shared_subscriptions !== false;

  return [
    { to: "/", label: t("nav.home"), auth: false },
    { to: "/pricing", label: t("nav.pricing"), auth: false },
    ...(fullMode
      ? [{ to: "/marketplace", label: t("nav.marketplace"), auth: false }]
      : []),
    ...(showOfficialChannels
      ? [
          {
            to: "/official-channels",
            label: t("nav.officialChannels"),
            auth: false,
          },
        ]
      : []),
    ...(showSharedSubscriptions
      ? [
          {
            to: "/shared-subscriptions",
            label: t("nav.sharedSubscriptions"),
            auth: true,
          },
        ]
      : []),
    { to: "/packages", label: t("nav.packages"), auth: false },
    ...(showAppMarket
      ? [{ to: "/apps", label: t("nav.apps"), auth: false }]
      : []),
    ...(site?.allow_sub_dist
      ? [{ to: "/sub-site", label: t("subDist.nav"), auth: false }]
      : []),
    { to: "/dashboard", label: t("nav.dashboard"), auth: true },
    { to: "/tokens", label: t("nav.apiKeys"), auth: true },
    ...(fullMode && site?.allow_provider_registration
      ? [
          {
            to: "/provider-application",
            label: t("nav.providerApplication"),
            auth: true,
          },
        ]
      : []),
    { to: "/logs", label: t("nav.logs"), auth: true },
    ...(site?.enable_topup
      ? [{ to: "/topup", label: t("nav.topup"), auth: true }]
      : []),
    { to: "/account", label: t("nav.account"), auth: true },
  ];
}

export function getVisibleNavItems(navItems, user) {
  return navItems.filter((item) => !item.auth || user);
}

const userMenuNavItems = [
  "/dashboard",
  "/tokens",
  "/logs",
  "/topup",
  "/provider-application",
  "/account",
];
const userMenuNavTargets = new Set(userMenuNavItems);

export function getHeaderNavItems(navItems) {
  return navItems.filter((item) => !userMenuNavTargets.has(item.to));
}

export function getUserMenuNavItems(navItems, user) {
  if (!user) return [];
  const visibleItems = getVisibleNavItems(navItems, user);
  return userMenuNavItems
    .map((to) => visibleItems.find((item) => item.to === to))
    .filter(Boolean);
}

export function isSiteNavActive(pathname, to) {
  return pathname === to || (to === "/logs" && pathname === "/tasks");
}
