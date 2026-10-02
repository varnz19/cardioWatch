import React from 'react';

export default function Footer({ onOpenLegal }) {
  return (
    <footer className="app-footer">
      <div className="footer-content">
        <div className="footer-left">
          <span>CardioWatch &copy; 2026. Academic Machine Learning Surveillance Laboratory.</span>
        </div>
        <div className="footer-links">
          <button type="button" onClick={() => onOpenLegal('privacy')}>Privacy Policy &amp; Data Governance</button>
          <span>&bull;</span>
          <button type="button" onClick={() => onOpenLegal('terms')}>Terms of Service</button>
        </div>
      </div>
    </footer>
  );
}
