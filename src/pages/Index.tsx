
import React from 'react';
import Header from '@/components/Header';
import SimulationDashboard from '@/components/SimulationDashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Car, Bed, Clock, Users, InfoIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Helper component for abbreviations with tooltips
const Abbreviation = ({ term, explanation, children }) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger className="cursor-help border-b border-dotted border-gray-400">
          {children}
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">{term}</p>
          <p>{explanation}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

const Index: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState("optimointi");

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="pb-16">
        <div className="container mx-auto px-4 py-4">
          <Card className="mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Lyhenteet ja termit</CardTitle>
              <CardDescription>
                Sovelluksessa käytetyt lyhenteet ja erikoissanasto
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <p className="font-medium">PACU</p>
                  <p className="text-sm text-gray-600">Post-Anesthesia Care Unit, Heräämö</p>
                </div>
                <div className="space-y-1">
                  <p className="font-medium">OR</p>
                  <p className="text-sm text-gray-600">Operating Room, Leikkaussali</p>
                </div>
                <div className="space-y-1">
                  <p className="font-medium">Phase I</p>
                  <p className="text-sm text-gray-600">Heräämön välitön toipumisvaihe</p>
                </div>
                <div className="space-y-1">
                  <p className="font-medium">Phase II</p>
                  <p className="text-sm text-gray-600">Heräämön jatkotoipumisvaihe</p>
                </div>
                <div className="space-y-1">
                  <p className="font-medium">HTV</p>
                  <p className="text-sm text-gray-600">Henkilötyövuosi</p>
                </div>
                <div className="space-y-1">
                  <p className="font-medium">KPI</p>
                  <p className="text-sm text-gray-600">Key Performance Indicator, Suorituskykymittari</p>
                </div>
                <div className="space-y-1">
                  <p className="font-medium">R4</p>
                  <p className="text-sm text-gray-600">Rakennemuutoshanke 4, Sairaaloiden tehostamisohjelma</p>
                </div>
                <div className="space-y-1">
                  <p className="font-medium">p95</p>
                  <p className="text-sm text-gray-600">95. persentiili, arvo jonka alle jää 95% havainnoista</p>
                </div>
                <div className="space-y-1">
                  <p className="font-medium">α (alpha)</p>
                  <p className="text-sm text-gray-600">Ruuhkahuippujen painokerroin optimoinnissa</p>
                </div>
                <div className="space-y-1">
                  <p className="font-medium">β (beta)</p>
                  <p className="text-sm text-gray-600">Ylitöiden painokerroin optimoinnissa</p>
                </div>
                <div className="space-y-1">
                  <p className="font-medium">γ (gamma)</p>
                  <p className="text-sm text-gray-600">Lisäsalien kustannuksen painokerroin optimoinnissa</p>
                </div>
              </div>
            </CardContent>
          </Card>

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
                      <p className="font-medium flex items-center gap-1">
                        <Abbreviation term="Alpha" explanation="Optimoinnin painokerroin ruuhkahuipuille">
                          α
                        </Abbreviation> - Ruuhkahuippu (Peak Occupancy)
                      </p>
                      <p className="text-sm text-gray-600">Painokerroin määrittää kuinka paljon optimointi pyrkii tasaamaan heräämön ruuhkahuippuja. Korkea arvo tasaa kuormitusta tehokkaammin.</p>
                    </div>
                    <div>
                      <p className="font-medium flex items-center gap-1">
                        <Abbreviation term="Beta" explanation="Optimoinnin painokerroin ylitöille">
                          β
                        </Abbreviation> - Ylityöt (Overtime)
                      </p>
                      <p className="text-sm text-gray-600">Painokerroin määrittää kuinka paljon optimointi pyrkii välttämään henkilöstön ylitöitä. Korkea arvo vähentää ylitöitä tehokkaammin.</p>
                    </div>
                    <div>
                      <p className="font-medium flex items-center gap-1">
                        <Abbreviation term="Gamma" explanation="Optimoinnin painokerroin lisäsalien kustannuksille">
                          γ
                        </Abbreviation> - Lisäsalien kustannus (Extra OR Cost)
                      </p>
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
                    <Car className="h-5 w-5 text-green-500" />
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
                      <p className="text-sm text-gray-600">Potilas siirtyy leikkaussalista (<Abbreviation term="Operating Room" explanation="Leikkaussali">OR</Abbreviation>) heräämöön (<Abbreviation term="Post-Anesthesia Care Unit" explanation="Heräämö">PACU</Abbreviation> <Abbreviation term="Phase I" explanation="Välitön toipumisvaihe">Phase I</Abbreviation>) ja heräämön kautta (<Abbreviation term="Phase II" explanation="Jatkotoipumisvaihe">Phase II</Abbreviation>) joko kotiin tai osastolle.</p>
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
                    Potilaan kulku heräämön (<Abbreviation term="Post-Anesthesia Care Unit" explanation="Heräämö">PACU</Abbreviation>) eri vaiheiden läpi
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
