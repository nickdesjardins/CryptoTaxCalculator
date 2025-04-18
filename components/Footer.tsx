import React from 'react';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-100 text-gray-600 py-4 px-8 text-center text-sm">
      © {currentYear} PcSquad. All rights reserved.
    </footer>
  );
};

export default Footer;