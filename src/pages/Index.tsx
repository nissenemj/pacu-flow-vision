
import React from 'react';
import Header from '@/components/Header';
import SimulationDashboard from '@/components/SimulationDashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Chart, Bed, Clock, Users } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Index: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState("optimointi");

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="pb-16">
        <div className="container mx-auto px-4 py-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
            <TabsList>
              <TabsTrigger value="optimointi">Optimointi</TabsTrigger>
              <TabsTrigger value="prosessit">Prosessityypit</TabsTrigger>
              <TabsTrigger value="heraamo">Heräämön vaiheet</TabsTrigger>
            </TabsList>
            
            <TabsContent value="optimointi">
              <Card>
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
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="prosessit">
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Chart className="h-5 w-5 text-green-500" />
                    <CardTitle className="text-lg">Prosessityypit</CardTitle>
                  </div>
                  <CardDescription>
                    Erilaiset potilasvirrat leikkaussalista eteenpäin
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <p className="font-medium">Standardi prosessi</p>
                      <p className="text-sm text-gray-600">Potilas siirtyy leikkaussalista heräämöön (Phase I) ja heräämön kautta (Phase II) joko kotiin tai osastolle.</p>
                    </div>
                    <div>
                      <p className="font-medium">Polikliininen (Outpatient)</p>
                      <p className="text-sm text-gray-600">Potilas kotiutuu suoraan leikkaussalista käymättä heräämössä. Nämä potilaat eivät käytä heräämön resursseja lainkaan.</p>
                    </div>
                    <div>
                      <p className="font-medium">Suora siirto (Direct Transfer)</p>
                      <p className="text-sm text-gray-600">Potilas siirtyy leikkaussalista suoraan osastolle tai teho-osastolle ilman käyntiä heräämössä. Nämä potilaat eivät käytä heräämön resursseja.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="heraamo">
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Bed className="h-5 w-5 text-red-500" />
                    <CardTitle className="text-lg">Heräämön vaiheet</CardTitle>
                  </div>
                  <CardDescription>
                    Potilaan kulku heräämön eri vaiheiden läpi
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <p className="font-medium">Phase I - Välitön toipuminen</p>
                      <p className="text-sm text-gray-600">Potilaan intensiivinen monitorointi ja hoito heti leikkauksen jälkeen. Tämä vaihe vaatii enemmän hoitajaresursseja ja erikoislaitteita.</p>
                    </div>
                    <div>
                      <p className="font-medium">Phase II - Jatkotoipuminen</p>
                      <p className="text-sm text-gray-600">Potilaan vähemmän intensiivinen vaihe, jossa valmistaudutaan kotiutukseen tai osastolle siirtoon. Tämä vaihe vaatii vähemmän hoitajaresursseja.</p>
                    </div>
                    <div>
                      <p className="font-medium">Resurssirajoitteet</p>
                      <div className="flex flex-col space-y-1 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Bed className="h-4 w-4 text-blue-500" />
                          <span>Phase I ja Phase II -vaiheen sängyt on eriytetty</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-blue-500" />
                          <span>Hoitajat on jaettu rooleihin erikoistumisen mukaan</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-blue-500" />
                          <span>Vuodeosastojen saatavuus vaihtelee vuorokaudenajan mukaan</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
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
