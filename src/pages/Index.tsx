
import React from 'react';
import Header from '@/components/Header';
import SimulationDashboard from '@/components/SimulationDashboard';

const Index: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="pb-16">
        <SimulationDashboard />
      </main>
      <footer className="border-t py-4">
        <div className="container mx-auto px-4 text-center text-sm text-gray-500">
          PACU Flow Vision &copy; 2025 - Heräämösimuloinnin johtamistyökalu
        </div>
      </footer>
    </div>
  );
};

export default Index;
