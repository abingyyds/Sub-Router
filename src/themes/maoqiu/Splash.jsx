import React, { useEffect, useState } from 'react';

const SPLASH_KEY = 'maoqiu-splash-seen';

export default function MaoqiuSplash() {
  const [visible, setVisible] = useState(() => {
    try {
      return sessionStorage.getItem(SPLASH_KEY) !== '1';
    } catch (e) {
      return true;
    }
  });
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!visible) return undefined;
    const leaveTimer = window.setTimeout(() => setLeaving(true), 1450);
    const hideTimer = window.setTimeout(() => {
      try {
        sessionStorage.setItem(SPLASH_KEY, '1');
      } catch (e) {}
      setVisible(false);
    }, 2000);

    return () => {
      window.clearTimeout(leaveTimer);
      window.clearTimeout(hideTimer);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div className={`maoqiu-splash ${leaving ? 'maoqiu-splash--leaving' : ''}`}>
      <div className="maoqiu-splash__halo" />
      <div className="maoqiu-splash__mark">
        <img src="/maoqiu-ai.png" alt="Maoqiu AI" />
      </div>
      <div className="maoqiu-splash__title">毛球</div>
      <div className="maoqiu-splash__subtitle">智能 · 创造 · 无限可能</div>
      <div className="maoqiu-splash__beam" />
    </div>
  );
}
