
import React from 'react';
import { Activity } from 'lucide-react';

const Header: React.FC = () => {
  return (
    <header className="bg-white shadow-sm">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-6 w-6 text-medical-teal" />
          <h1 className="text-xl font-semibold text-gray-900">PACU Flow Vision</h1>
        </div>
        <div className="text-sm text-gray-600">
          Heräämösimulointityökalu
        </div>
      </div>
    </header>
  );
};

export default Header;
