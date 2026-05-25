import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function LogSubnav({ active }) {
  const { t } = useTranslation();
  const items = [
    { key: 'logs', to: '/logs', label: t('logs.callLogs') },
    { key: 'tasks', to: '/tasks', label: t('tasks.title') },
  ];

  return (
    <div className="mb-6 flex justify-center">
      <div className="inline-flex rounded-full border border-page-divider bg-page-surface p-1 shadow-sm">
        {items.map((item) => (
          <Link
            key={item.key}
            to={item.to}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              active === item.key
                ? 'bg-brand-600 text-white'
                : 'text-page-muted hover:bg-page-surface-hover hover:text-page'
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
