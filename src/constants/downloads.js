export const localDownload = (id) => `/downloads/${id}`;

export const DOWNLOAD_TOOLS = [
  {
    id: 'cc-switch',
    title: 'CC Switch',
    version: 'v3.14.1',
    descZh: '统一管理 Claude Code、Codex、Gemini CLI、OpenCode、OpenClaw、Hermes 等客户端，支持一键导入 Provider。',
    descEn: 'Manage Claude Code, Codex, Gemini CLI, OpenCode, OpenClaw, Hermes and more in one place, with one-click provider import.',
    officialRepo: 'https://github.com/farion1231/cc-switch',
    releases: 'https://github.com/farion1231/cc-switch/releases/latest',
    groups: [
      {
        title: 'Windows',
        links: [
          { label: 'Windows x64 MSI', href: localDownload('cc-switch-windows-x64-msi'), recommended: true },
          { label: 'Windows x64 Portable ZIP', href: localDownload('cc-switch-windows-x64-portable-zip') },
        ],
      },
      {
        title: 'macOS',
        links: [
          { label: 'macOS Universal DMG', href: localDownload('cc-switch-macos-universal-dmg'), recommended: true },
          { label: 'macOS Universal ZIP', href: localDownload('cc-switch-macos-universal-zip') },
          { label: 'macOS Universal TAR.GZ', href: localDownload('cc-switch-macos-universal-tar-gz') },
        ],
      },
      {
        title: 'Linux',
        links: [
          { label: 'Linux x64 DEB', href: localDownload('cc-switch-linux-x64-deb'), recommended: true },
          { label: 'Linux ARM64 DEB', href: localDownload('cc-switch-linux-arm64-deb') },
          { label: 'Linux x64 RPM', href: localDownload('cc-switch-linux-x64-rpm') },
          { label: 'Linux ARM64 RPM', href: localDownload('cc-switch-linux-arm64-rpm') },
          { label: 'Linux x64 AppImage', href: localDownload('cc-switch-linux-x64-appimage') },
          { label: 'Linux ARM64 AppImage', href: localDownload('cc-switch-linux-arm64-appimage') },
        ],
      },
    ],
  },
  {
    id: 'codex',
    title: 'Codex',
    version: '0.128.0',
    descZh: 'OpenAI 官方 Codex 桌面版，提供 Windows / macOS 站内中转下载；Linux 可继续使用 npm 安装。',
    descEn: 'OpenAI official Codex desktop app with local relayed Windows and macOS downloads. Linux users can continue using npm installation.',
    installGuide: 'https://github.com/openai/codex#installation',
    releases: 'https://github.com/openai/codex/releases/latest',
    groups: [
      {
        title: 'Windows',
        links: [
          { label: 'Windows x64 Desktop EXE', href: localDownload('codex-windows-x64-exe'), recommended: true },
          { label: 'Windows ARM64 Desktop EXE', href: localDownload('codex-windows-arm64-exe') },
        ],
      },
      {
        title: 'macOS',
        links: [
          { label: 'macOS Apple Silicon Desktop DMG', href: localDownload('codex-macos-arm64-dmg'), recommended: true },
          { label: 'macOS Intel Desktop DMG', href: localDownload('codex-macos-intel-dmg') },
        ],
      },
    ],
  },
  {
    id: 'cherry-studio',
    title: 'Cherry Studio',
    version: 'v1.9.2',
    descZh: '支持接入 OpenAI / Anthropic / Gemini 服务商，可配合本站生成参数使用。',
    descEn: 'Connects to OpenAI, Anthropic and Gemini providers and works well with generated settings from this site.',
    providerDocs: 'https://docs.cherry-ai.com/advanced-basic/providers/custom-providers',
    releases: 'https://github.com/CherryHQ/cherry-studio/releases/latest',
    groups: [
      {
        title: 'Windows',
        links: [
          { label: 'Windows x64 Setup EXE', href: localDownload('cherry-studio-windows-x64-setup-exe'), recommended: true },
          { label: 'Windows x64 Portable EXE', href: localDownload('cherry-studio-windows-x64-portable-exe') },
          { label: 'Windows ARM64 Setup EXE', href: localDownload('cherry-studio-windows-arm64-setup-exe') },
        ],
      },
      {
        title: 'macOS',
        links: [
          { label: 'macOS Intel DMG', href: localDownload('cherry-studio-macos-intel-dmg'), recommended: true },
          { label: 'macOS Apple Silicon DMG', href: localDownload('cherry-studio-macos-arm64-dmg') },
        ],
      },
      {
        title: 'Linux',
        links: [
          { label: 'Linux x64 AppImage', href: localDownload('cherry-studio-linux-x64-appimage'), recommended: true },
          { label: 'Linux x64 DEB', href: localDownload('cherry-studio-linux-x64-deb') },
          { label: 'Linux ARM64 AppImage', href: localDownload('cherry-studio-linux-arm64-appimage') },
          { label: 'Linux ARM64 DEB', href: localDownload('cherry-studio-linux-arm64-deb') },
        ],
      },
    ],
  },
  {
    id: 'nodejs',
    title: 'Node.js',
    version: 'v24.15.0',
    descZh: '运行 Codex CLI、Claude Code 相关工具和常见前端开发工具所需的 Node.js LTS 环境。',
    descEn: 'Node.js LTS runtime for Codex CLI, Claude Code related tools and common frontend tooling.',
    releases: 'https://nodejs.org/en/download',
    groups: [
      {
        title: 'Windows',
        links: [
          { label: 'Windows x64 MSI', href: localDownload('nodejs-windows-x64-msi'), recommended: true },
          { label: 'Windows ARM64 ZIP', href: localDownload('nodejs-windows-arm64-zip') },
        ],
      },
      {
        title: 'macOS',
        links: [
          { label: 'macOS Intel PKG', href: localDownload('nodejs-macos-intel-pkg'), recommended: true },
          { label: 'macOS Apple Silicon TAR', href: localDownload('nodejs-macos-arm64-tar-gz') },
        ],
      },
      {
        title: 'Linux',
        links: [
          { label: 'Linux x64 TAR', href: localDownload('nodejs-linux-x64-tar-xz'), recommended: true },
          { label: 'Linux ARM64 TAR', href: localDownload('nodejs-linux-arm64-tar-xz') },
        ],
      },
    ],
  },
];

export const CCSWITCH_PRIMARY_DOWNLOAD = localDownload('cc-switch-windows-x64-msi');
export const CCSWITCH_REPO_URL = 'https://github.com/farion1231/cc-switch';
