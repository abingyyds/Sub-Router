import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ClipboardList, KeyRound, LogOut, UserCircle } from 'lucide-react';

function getUserInitial(user) {
  const name = user?.display_name || user?.username || user?.email || 'U';
  return Array.from(String(name).trim() || 'U')[0]?.toUpperCase() || 'U';
}

function getMenuIcon(to) {
  if (to === '/tokens') return KeyRound;
  if (to === '/logs') return ClipboardList;
  return UserCircle;
}

export default function UserMenu({
  user,
  items = [],
  onLogout,
  logoutLabel,
  className = '',
  buttonClassName = '',
  menuClassName = '',
  itemClassName = '',
  logoutClassName = '',
  showName = true,
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const userName = user?.display_name || user?.username || user?.email || '';

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (!menuRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const handleLogout = async () => {
    setOpen(false);
    await onLogout?.();
  };

  return (
    <div ref={menuRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`inline-flex h-9 items-center gap-2 rounded-full border px-2.5 text-sm transition-colors ${buttonClassName}`}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-current/10 text-xs font-semibold">
          {getUserInitial(user)}
        </span>
        {showName && userName && (
          <span className="hidden max-w-[120px] truncate lg:inline xl:max-w-[160px]">
            {userName}
          </span>
        )}
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="menu"
          className={`absolute right-0 top-full z-50 mt-2 min-w-[190px] overflow-hidden rounded-xl border p-1.5 shadow-xl backdrop-blur-xl ${menuClassName}`}
        >
          {items.map((item) => (
            <UserMenuLink
              key={item.to}
              item={item}
              itemClassName={itemClassName}
              onSelect={() => setOpen(false)}
            />
          ))}
          <button
            type="button"
            role="menuitem"
            onClick={handleLogout}
            className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${logoutClassName || itemClassName}`}
          >
            <LogOut className="h-4 w-4 opacity-60" />
            <span>{logoutLabel}</span>
          </button>
        </div>
      )}
    </div>
  );
}

function UserMenuLink({ item, itemClassName, onSelect }) {
  const Icon = getMenuIcon(item.to);

  return (
    <Link
      to={item.to}
      role="menuitem"
      onClick={onSelect}
      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${itemClassName}`}
    >
      <Icon className="h-4 w-4 opacity-60" />
      <span>{item.label}</span>
    </Link>
  );
}
