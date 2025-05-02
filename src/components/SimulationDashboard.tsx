import React, { useState, useCallback } from 'react';
import { 
  defaultSimulationParams, 
  runSimulation, 
  SimulationResults, 
  SimulationParams,
  SurgeryCase,
  ORBlock
} from '@/lib/simulation';
import { toast } from '@/components/ui/use-toast';
import SimulationParameters from './SimulationParameters';
import ResultsCharts from './ResultsCharts';
import ORScheduleChart from './ORScheduleChart';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Update the Block interface to match ORBlock
interface Block extends ORBlock {
  label: string;
  allowedProcedures: string[];
}

const SimulationDashboard: React.FC = () => {
  // Update params to include blocks
  const [params, setParams] = useState<SimulationParams & { orBlocks?: Block[] }>({
    ...defaultSimulationParams,
    orBlocks: []
  });
  
  const [results, setResults] = useState<SimulationResults | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [savedScenarios, setSavedScenarios] = useState<{name: string, params: SimulationParams, results: SimulationResults | null}[]>([]);
  const [activeTab, setActiveTab] = useState("simulator");
  const [resultTab, setResultTab] = useState("metrics");

  const handleParamChange = useCallback((key: string, value: any) => {
    setParams((prev) => {
      if (key === 'averageDailySurgeries') {
        return {
          ...prev,
          surgeryScheduleTemplate: {
            ...prev.surgeryScheduleTemplate,
            averageDailySurgeries: value
          }
        };
      }
      return {
        ...prev,
        [key]: value
      };
    });
  }, []);

  const handlePatientDistributionChange = useCallback((classId: string, value: number) => {
    setParams((prev) => {
      // Adjust other percentages to maintain sum close to 1
      const newDistribution = {...prev.patientClassDistribution};
      
      // Calculate how much we're changing this value
      const delta = value - newDistribution[classId];
      
      // Set the new value for this class
      newDistribution[classId] = value;
      
      // Distribute the delta proportionally among other classes
      const otherClassIds = Object.keys(newDistribution).filter(id => id !== classId);
      const totalOther = otherClassIds.reduce((sum, id) => sum + newDistribution[id], 0);
      
      if (totalOther > 0) {
        otherClassIds.forEach(id => {
          const proportion = newDistribution[id] / totalOther;
          newDistribution[id] = Math.max(0, newDistribution[id] - delta * proportion);
          // Ensure no negative values
          if (newDistribution[id] < 0.01) newDistribution[id] = 0.01;
        });
      }
      
      // Normalize to ensure sum is 1
      const sum = Object.values(newDistribution).reduce((total, val) => total + val, 0);
      if (sum > 0) {
        Object.keys(newDistribution).forEach(id => {
          newDistribution[id] = newDistribution[id] / sum;
        });
      }
      
      return {
        ...prev,
        patientClassDistribution: newDistribution
      };
    });
  }, []);

  const runSimulationHandler = useCallback(() => {
    setIsRunning(true);
    // Use setTimeout to allow UI to update before running simulation
    setTimeout(() => {
      try {
        // If we have blocks defined, we would generate a surgeryList from the blocks here
        // For now, we'll just use the existing simulation
        
        const simulationResults = runSimulation(params);
        setResults(simulationResults);
        toast({
          title: "Simulaatio valmis",
          description: `${params.simulationDays} päivän simulaatio suoritettu onnistuneesti.`
        });
        setResultTab("metrics"); // Switch to metrics tab after simulation
      } catch (error) {
        console.error("Simulation error:", error);
        toast({
          title: "Virhe simulaatiossa",
          description: "Simulaation suorittamisessa tapahtui virhe.",
          variant: "destructive"
        });
      } finally {
        setIsRunning(false);
      }
    }, 100);
  }, [params]);

  const saveScenario = useCallback(() => {
    if (!results) return;
    
    const scenarioName = prompt("Anna skenaariolle nimi:", `Skenaario ${savedScenarios.length + 1}`);
    if (!scenarioName) return;
    
    setSavedScenarios(prev => [
      ...prev, 
      {
        name: scenarioName,
        params: {...params},
        results: results
      }
    ]);
    
    toast({
      title: "Skenaario tallennettu",
      description: `Skenaario "${scenarioName}" on tallennettu.`
    });
    
    setActiveTab("scenarios");
  }, [params, results, savedScenarios.length]);

  const loadScenario = useCallback((index: number) => {
    const scenario = savedScenarios[index];
    
    // Convert ORBlocks to Blocks if necessary
    const scenarioParams = {...scenario.params};
    if (scenarioParams.orBlocks) {
      scenarioParams.orBlocks = scenarioParams.orBlocks.map(block => {
        // Ensure block has all required properties of Block interface
        return {
          ...block,
          label: block.label || `Block ${block.id}`,
          allowedProcedures: block.allowedProcedures || block.allowedClasses || []
        };
      });
    }
    
    setParams(scenarioParams as SimulationParams & { orBlocks?: Block[] });
    setResults(scenario.results);
    setActiveTab("simulator");
    
    toast({
      title: "Skenaario ladattu",
      description: `Skenaario "${scenario.name}" on ladattu simulaattoriin.`
    });
  }, [savedScenarios]);

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <Tabs defaultValue="simulator" value={activeTab} onValueChange={setActiveTab}>
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="simulator">Simulaattori</TabsTrigger>
            <TabsTrigger value="scenarios">Skenaariot ({savedScenarios.length})</TabsTrigger>
            <TabsTrigger value="guide">Ohjeet</TabsTrigger>
          </TabsList>
          
          {results && activeTab === "simulator" && (
            <button 
              onClick={saveScenario}
              className="bg-medical-blue text-white px-3 py-1 text-sm rounded hover:bg-opacity-90"
            >
              Tallenna skenaario
            </button>
          )}
        </div>
        
        <TabsContent value="simulator" className="space-y-6">
          <SimulationParameters
            params={params}
            onParamChange={handleParamChange}
            onPatientDistributionChange={handlePatientDistributionChange}
            onRunSimulation={runSimulationHandler}
            isRunning={isRunning}
          />
          
          {isRunning ? (
            <Card className="h-[350px] flex items-center justify-center animate-pulse-slow">
              <CardContent>
                <p className="text-center">
                  Simulaatio käynnissä... Odota hetki.
                </p>
              </CardContent>
            </Card>
          ) : results ? (
            <div className="space-y-4">
              <Tabs value={resultTab} onValueChange={setResultTab}>
                <TabsList>
                  <TabsTrigger value="metrics">Tulokset</TabsTrigger>
                  {(params.surgeryScheduleType === 'custom' && params.customSurgeryList) && (
                    <TabsTrigger value="schedule">Leikkausaikataulu</TabsTrigger>
                  )}
                  {params.orBlocks && params.orBlocks.length > 0 && (
                    <TabsTrigger value="blocks">Saliblokit</TabsTrigger>
                  )}
                </TabsList>
                
                <TabsContent value="metrics" className="pt-4">
                  <ResultsCharts results={results} patientClasses={params.patientClasses} />
                </TabsContent>
                
                <TabsContent value="schedule" className="pt-4">
                  <ORScheduleChart 
                    surgeryList={params.customSurgeryList || []} 
                    patientClasses={params.patientClasses}
                  />
                </TabsContent>
                
                <TabsContent value="blocks" className="pt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Saliblokkien yhteenveto</CardTitle>
                      <CardDescription>
                        Leikkaussalien käyttö potilasluokittain
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {params.orBlocks && params.orBlocks.length > 0 ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {params.patientClasses.map(pc => {
                              // Count blocks with this patient class
                              const blockCount = params.orBlocks?.filter(
                                b => b.allowedProcedures.includes(pc.id)
                              ).length || 0;
                              
                              // Calculate total hours for this class
                              const totalHours = params.orBlocks?.reduce((sum, block) => {
                                if (block.allowedProcedures.includes(pc.id)) {
                                  return sum + (block.end - block.start) / 60;
                                }
                                return sum;
                              }, 0) || 0;
                              
                              return (
                                <Card key={pc.id}>
                                  <CardContent className="p-4">
                                    <div className="flex items-center gap-2">
                                      <div 
                                        className="w-3 h-3 rounded-full" 
                                        style={{ backgroundColor: pc.color }}
                                      />
                                      <span className="font-medium">{pc.name}</span>
                                    </div>
                                    <div className="mt-2 text-2xl font-bold">
                                      {blockCount} <span className="text-sm font-normal">blokkia</span>
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                      {Math.round(totalHours * 10) / 10} tuntia
                                    </div>
                                  </CardContent>
                                </Card>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <p className="text-center text-muted-foreground">
                          Ei saliblokki tietoja saatavilla.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <Card className="h-[350px] flex items-center justify-center">
              <CardContent>
                <p className="text-center text-muted-foreground">
                  Aja simulaatio nähdäksesi tulokset
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="scenarios">
          {savedScenarios.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center h-40">
                <p className="text-muted-foreground">
                  Ei tallennettuja skenaarioita. Aja simulaatio ja tallenna skenaario nähdäksesi sen täällä.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {savedScenarios.map((scenario, index) => (
                <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => loadScenario(index)}>
                  <CardHeader>
                    <CardTitle>{scenario.name}</CardTitle>
                    <CardDescription>
                      {scenario.params.beds} vuodetta, {scenario.params.nurses} hoitajaa
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Potilasjakauma:</span>
                        <div className="flex gap-1">
                          {Object.entries(scenario.params.patientClassDistribution).map(([id, value]) => (
                            <span key={id} className="px-1 rounded text-xs" style={{
                              backgroundColor: scenario.params.patientClasses.find(pc => pc.id === id)?.color,
                              color: 'white'
                            }}>
                              {id}: {Math.round(value * 100)}%
                            </span>
                          ))}
                        </div>
                      </div>
                      {scenario.results && (
                        <>
                          <div className="flex justify-between text-sm">
                            <span>Keskim. vuodekäyttö:</span>
                            <span className="font-medium">
                              {Math.round(scenario.results.meanBedOccupancy * 100)}%
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Keskim. odotusaika:</span>
                            <span className="font-medium">
                              {Math.round(scenario.results.meanWaitTime)} min
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="guide">
          <Card>
            <CardHeader>
              <CardTitle>Miten PACU-simulaation suunnittelu kannattaa aloittaa?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-semibold">Simulaation tarkoitus</h3>
                <p>Tämän sovelluksen avulla voit mallintaa heräämön (PACU) toimintaa ja resurssitarpeita erilaisilla potilasmäärillä ja -tyypeillä. Simulaatio käyttää diskreettiä tapahtumasimulointia (DES) mallintaakseen potilasvirtaa.</p>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-semibold">Leikkauslistan ja saliblokkien kytkeminen</h3>
                <p>Voit kytkeä PACU-kuormitussimulointiin konkreettisen leikkauslistan ja salisuunnittelun:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Määrittele leikkaussalit ja niiden blokit "Salisuunnittelu"-välilehdellä</li>
                  <li>Luo automaattisesti generoitu leikkauslista "Leikkauslista"-välilehdeltä</li>
                  <li>Lataa CSV-tiedosto joka sisältää tiedot leikkauksista</li>
                  <li>Tutki miten eri leikkausaikataulut vaikuttavat PACU:n kuormitukseen</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-semibold">Potilasluokat</h3>
                <p>Simulaatio jakaa potilaat neljään luokkaan:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Luokka A: Same-day kotiutus heräämöstä</li>
                  <li>Luokka B: Next-day kotiutus (yö heräämössä)</li>
                  <li>Luokka C: Overnight → ward</li>
                  <li>Luokka D: Standard PACU → ward samana päivänä</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-semibold">Blokki-pohjainen aikataulutus</h3>
                <p>Uusi salisuunnittelu-työkalu mahdollistaa:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Leikkaussalien määrittämisen (lisääminen/poistaminen)</li>
                  <li>Aikablokkien luomisen ja hallinnan</li>
                  <li>Potilasluokkien kohdistamisen tiettyihin blokkeihin</li>
                  <li>Kuormituksen optimoinnin PACU:ssa</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-semibold">Resurssit</h3>
                <p>Voit säätää vuodepaikkojen ja hoitajien määrää sekä hoitaja-potilassuhdetta. Simulaatio estää uusia saapumisia, jos kumpi tahansa resurssi on täynnä.</p>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-semibold">Tulokset</h3>
                <p>Simulaation jälkeen näet useita hyödyllisiä mittareita:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Vuodepaikkojen ja hoitajien käyttöasteet</li>
                  <li>Odotusviiveet</li>
                  <li>Potilasjakauman</li>
                  <li>Yhteenvedon keskeisistä tunnusluvuista</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-semibold">Skenaarioiden vertailu</h3>
                <p>Tallenna eri skenaarioita vertaillaksesi miten erilaiset potilasjakaumat tai resurssimäärät vaikuttavat heräämön toimintaan. Tämä auttaa kapasiteettisuunnittelussa ja henkilöstöbudjetin laatimisessa.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SimulationDashboard;
