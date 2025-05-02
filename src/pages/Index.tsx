
import React from 'react';
import Header from '@/components/Header';
import SimulationDashboard from '@/components/SimulationDashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

const Index: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="pb-16">
        <div className="container mx-auto px-4 py-4">
          <Card className="mb-6">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-blue-500" />
                <CardTitle className="text-lg">Optimoinnin painokertoimet</CardTitle>
              </div>
              <CardDescription>
                Simulaation painokertoimet vaikuttavat optimointialgoritmien toimintaan ja tuloksiin
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="font-medium">α - Ruuhkahuippu (Peak Occupancy)</p>
                  <p className="text-sm text-gray-600">Painokerroin määrittää kuinka paljon optimointi pyrkii tasaamaan heräämön ruuhkahuippuja. Korkea arvo tasaa kuormitusta tehokkaammin.</p>
                </div>
                <div>
                  <p className="font-medium">β - Ylityöt (Overtime)</p>
                  <p className="text-sm text-gray-600">Painokerroin määrittää kuinka paljon optimointi pyrkii välttämään henkilöstön ylitöitä. Korkea arvo vähentää ylitöitä tehokkaammin.</p>
                </div>
                <div>
                  <p className="font-medium">γ - Lisäsalien kustannus (Extra OR Cost)</p>
                  <p className="text-sm text-gray-600">Painokerroin määrittää kuinka paljon optimointi huomioi lisäsalien käytöstä aiheutuvat kustannukset. Korkea arvo vähentää lisäsalien käyttöä.</p>
                </div>
                <div>
                  <p className="font-medium">Prosessityypit</p>
                  <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
                    <li><span className="font-medium">Standardi prosessi</span>: Potilas siirtyy leikkaussalista heräämöön</li>
                    <li><span className="font-medium">Polikliininen</span>: Potilas kotiutuu suoraan leikkaussalista käymättä heräämössä</li>
                    <li><span className="font-medium">Suora siirto</span>: Potilas siirtyy leikkaussalista suoraan osastolle tai teho-osastolle</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
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
