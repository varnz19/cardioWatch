import React from 'react';

export default function BottomNav({ activePage, setActivePage }) {
  const navItems = [
    {
      id: 'overview',
      label: 'Overview & Data',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <line x1="3" y1="9" x2="21" y2="9" />
          <line x1="9" y1="9" x2="9" y2="21" />
        </svg>
      )
    },
    {
      id: 'surveillance',
      label: 'ML Surveillance',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      )
    },
    {
      id: 'export',
      label: 'Tableau Export',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      )
    }
  ];

  return (
    <nav className="bottom-dock-nav" aria-label="Surveillance Navigation Dock">
      <div className="bottom-dock-container">
        {navItems.map((item) => {
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={`dock-item ${isActive ? 'active' : ''}`}
              onClick={() => setActivePage(item.id)}
              title={item.label}
            >
              <span className="dock-icon">{item.icon}</span>
              <span className="dock-label">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
