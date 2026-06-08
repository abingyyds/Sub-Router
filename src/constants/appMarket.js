const TOONFLOW_REPO_RAW =
  'https://raw.githubusercontent.com/HBAI-Ltd/Toonflow-app/master';
const INFINITE_CANVAS_REPO_RAW =
  'https://raw.githubusercontent.com/basketikun/infinite-canvas/main';
const PRODUCT_PAGE_REPO_RAW =
  'https://raw.githubusercontent.com/ziguishian/ai-product-page-generator/main';
const LIBRECHAT_REPO_RAW =
  'https://raw.githubusercontent.com/danny-avila/LibreChat/main';

const PLATFORM_APP_INTEGRATION = [
  'appMarket.integrationLogin',
  'appMarket.integrationProviders',
  'appMarket.integrationBilling',
];

export const APP_MARKET_APPS = [
  {
    id: 'toonflow',
    name: 'Toonflow',
    categoryKey: 'appMarket.categoryContent',
    statusKey: 'appMarket.statusLive',
    taglineKey: 'appMarket.toonflowTagline',
    descriptionKey: 'appMarket.toonflowDescription',
    logo: `${TOONFLOW_REPO_RAW}/docs/logo.png`,
    cover: `${TOONFLOW_REPO_RAW}/docs/screenshot/1.png`,
    appUrl: 'https://toonflow-app-production-4a00.up.railway.app/',
    sourceUrl: 'https://github.com/HBAI-Ltd/Toonflow-app',
    license: 'Apache-2.0',
    integration: PLATFORM_APP_INTEGRATION,
    featureKeys: [
      'appMarket.featureScreenplay',
      'appMarket.featureStoryboard',
      'appMarket.featureCharacter',
      'appMarket.featureVideo',
    ],
  },
  {
    id: 'infinite-canvas',
    name: 'Infinite Canvas',
    categoryKey: 'appMarket.categoryCreative',
    statusKey: 'appMarket.statusLive',
    taglineKey: 'appMarket.canvasTagline',
    descriptionKey: 'appMarket.canvasDescription',
    logo: `${INFINITE_CANVAS_REPO_RAW}/web/public/logo.svg`,
    cover: 'https://i.ibb.co/TDFvGWDT/image.png',
    appUrl: 'https://infinite-canvas-production-131b.up.railway.app/',
    sourceUrl: 'https://github.com/basketikun/infinite-canvas',
    license: 'AGPL-3.0',
    integration: PLATFORM_APP_INTEGRATION,
    featureKeys: [
      'appMarket.featureCanvas',
      'appMarket.featureImage',
      'appMarket.featureReferenceEdit',
      'appMarket.featureVideo',
    ],
  },
  {
    id: 'ai-product-page-generator',
    name: 'AI Product Page Generator',
    categoryKey: 'appMarket.categoryEcommerce',
    statusKey: 'appMarket.statusLive',
    taglineKey: 'appMarket.productPageTagline',
    descriptionKey: 'appMarket.productPageDescription',
    logo: `${PRODUCT_PAGE_REPO_RAW}/public/brand-icon.ico`,
    coverTone: 'from-rose-950 via-fuchsia-800 to-amber-600',
    appUrl: 'https://ai-product-page-generator-production.up.railway.app/',
    sourceUrl: 'https://github.com/ziguishian/ai-product-page-generator',
    license: 'MIT',
    integration: PLATFORM_APP_INTEGRATION,
    featureKeys: [
      'appMarket.featureProductAnalysis',
      'appMarket.featureProductPage',
      'appMarket.featureModuleEdit',
      'appMarket.featureMultiModel',
    ],
  },
  {
    id: 'librechat',
    name: 'LibreChat',
    categoryKey: 'appMarket.categoryChat',
    statusKey: 'appMarket.statusLive',
    taglineKey: 'appMarket.librechatTagline',
    descriptionKey: 'appMarket.librechatDescription',
    logo: `${LIBRECHAT_REPO_RAW}/client/public/assets/logo.svg`,
    coverTone: 'from-slate-950 via-slate-800 to-emerald-700',
    appUrl: 'https://librechat-production-c42f.up.railway.app/',
    sourceUrl: 'https://github.com/danny-avila/LibreChat',
    license: 'MIT',
    integration: PLATFORM_APP_INTEGRATION,
    featureKeys: [
      'appMarket.featureChat',
      'appMarket.featureAgents',
      'appMarket.featureMcp',
      'appMarket.featureFiles',
    ],
  },
];
