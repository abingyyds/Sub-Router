import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import maoqiuAiImage from '../../assets/maoqiu-ai.png';

export default function MaoqiuSplash() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(true);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const leaveTimer = window.setTimeout(() => setLeaving(true), 1450);
    const hideTimer = window.setTimeout(() => setVisible(false), 2000);

    return () => {
      window.clearTimeout(leaveTimer);
      window.clearTimeout(hideTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className={`maoqiu-splash ${leaving ? 'maoqiu-splash--leaving' : ''}`}>
      <div className="maoqiu-splash__halo" />
      <div className="maoqiu-splash__mark">
        <img src={maoqiuAiImage} alt="Maoqiu AI" />
      </div>
      <div className="maoqiu-splash__title">毛球</div>
      <div className="maoqiu-splash__subtitle">{t('home.maoqiuSubtitle')}</div>
      <div className="maoqiu-splash__beam" />
    </div>
  );
}
