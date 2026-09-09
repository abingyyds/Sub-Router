import React, { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import AuthGuard from "./components/AuthGuard";
import NotificationBell from "./components/NotificationBell";
import { useSite } from "./context/SiteContext";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import { useTranslation } from "react-i18next";
import { AlertTriangle } from "lucide-react";

const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const OAuthCallback = lazy(() => import("./pages/OAuthCallback"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const AffiliateCenter = lazy(() => import("./pages/AffiliateCenter"));
const Tokens = lazy(() => import("./pages/Tokens"));
const Packages = lazy(() => import("./pages/Packages"));
const Pricing = lazy(() => import("./pages/Pricing"));
const Docs = lazy(() => import("./pages/Docs"));
const OfficialChannels = lazy(() => import("./pages/OfficialChannels"));
const AppMarket = lazy(() => import("./pages/AppMarket"));
const Topup = lazy(() => import("./pages/Topup"));
const Logs = lazy(() => import("./pages/Logs"));
const Tasks = lazy(() => import("./pages/Tasks"));
const SubDistributor = lazy(() => import("./pages/SubDistributor"));
const Account = lazy(() => import("./pages/Account"));
const LegalDocument = lazy(() => import("./pages/LegalDocument"));
const Marketplace = lazy(() => import("./pages/Marketplace"));
const MarketplaceProvider = lazy(() => import("./pages/MarketplaceProvider"));
const SharedSubscriptions = lazy(() => import("./pages/SharedSubscriptions"));
const ProviderApplication = lazy(() => import("./pages/ProviderApplication"));

const Loading = () => (
  <div
    className="flex items-center justify-center min-h-screen"
    style={{ background: "var(--page-bg)" }}
  >
    <div
      className="w-8 h-8 rounded-full animate-spin"
      style={{
        border: "2px solid var(--page-spinner-track)",
        borderTopColor: "var(--page-spinner)",
      }}
    />
  </div>
);

function MainlandChinaUnavailable() {
  const { t } = useTranslation();
  const { site } = useSite();
  const title = t("本服务不对中国大陆提供");

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4 py-16"
      style={{ background: "var(--page-bg)", color: "var(--page-text)" }}
    >
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
          <AlertTriangle size={24} />
        </div>
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="mt-3 text-sm opacity-70">
          {t("当前地区暂不支持访问此分站。", {
            defaultValue: "This distributor site is not available in your region.",
          })}
        </p>
        {site?.name && <p className="mt-2 text-xs opacity-50">{site.name}</p>}
      </div>
    </div>
  );
}

function RegionGuard({ children }) {
  const { site, siteResolved } = useSite();
  const blocked =
    siteResolved &&
    (site?.dist_site_mainland_china_access_block_enabled === true ||
      site?.mainland_china_access_block_enabled === true) &&
    String(site?.client_country || "").toUpperCase() === "CN";

  if (blocked) return <MainlandChinaUnavailable />;
  return children;
}

function AppMarketRoute() {
  const { site } = useSite();

  if (site?.show_app_market === false) {
    return <Navigate to="/" replace />;
  }

  return <AppMarket />;
}

function OfficialChannelsRoute() {
  const { site, loading } = useSite();
  const showOfficialChannels =
    site?.show_official_channels !== false && site?.has_official_channels;

  if (loading) {
    return <Loading />;
  }

  if (!showOfficialChannels) {
    return <Navigate to="/" replace />;
  }

  return <OfficialChannels />;
}

function SharedSubscriptionsRoute() {
  const { site, loading, siteResolved } = useSite();

  if (loading || !siteResolved) {
    return <Loading />;
  }

  if (site?.show_shared_subscriptions === false) {
    return <Navigate to="/" replace />;
  }

  return <SharedSubscriptions />;
}

function FullModeRoute({ children, requireApplication = false }) {
  const { site, loading } = useSite();
  if (loading) return <Loading />;
  const fullMode = site?.full_mode === true || site?.display_mode === "full";
  if (!fullMode || (requireApplication && !site?.allow_provider_registration)) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function ThemedRoutes() {
  const { Home, Layout } = useTheme();

  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        {/* Public pages with themed layout */}
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/docs" element={<Docs />} />
          <Route
            path="/marketplace"
            element={
              <FullModeRoute>
                <Marketplace />
              </FullModeRoute>
            }
          />
          <Route
            path="/marketplace/providers/:slug"
            element={
              <FullModeRoute>
                <MarketplaceProvider />
              </FullModeRoute>
            }
          />
          <Route
            path="/official-channels"
            element={<OfficialChannelsRoute />}
          />
          <Route
            path="/official-channels/:channelId"
            element={<OfficialChannelsRoute />}
          />
          <Route path="/packages" element={<Packages />} />
          <Route path="/apps" element={<AppMarketRoute />} />
          <Route path="/sub-site" element={<SubDistributor />} />
          <Route path="/login" element={<Login />} />
          <Route path="/oauth/:provider" element={<OAuthCallback />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/user-agreement"
            element={<LegalDocument type="agreement" />}
          />
          <Route
            path="/privacy-policy"
            element={<LegalDocument type="privacy" />}
          />

          {/* Protected pages */}
          <Route element={<AuthGuard />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/affiliate" element={<AffiliateCenter />} />
            <Route path="/tokens" element={<Tokens />} />
            <Route
              path="/shared-subscriptions"
              element={<SharedSubscriptionsRoute />}
            />
            <Route
              path="/provider-application"
              element={
                <FullModeRoute requireApplication>
                  <ProviderApplication />
                </FullModeRoute>
              }
            />
            <Route path="/logs" element={<Logs />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/topup" element={<Topup />} />
            <Route path="/account" element={<Account />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <NotificationBell />
    </Suspense>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <RegionGuard>
        <ThemedRoutes />
      </RegionGuard>
    </ThemeProvider>
  );
}
