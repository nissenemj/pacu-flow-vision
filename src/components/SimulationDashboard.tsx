import React, { useState, useCallback } from 'react';
import { 
  defaultSimulationParams, 
  runSimulation, 
  SimulationResults, 
  SimulationParams,
  SurgeryCase,
  ORBlock,
  PatientClass
} from '@/lib/simulation';
import { toast } from '@/components/ui/use-toast';
import SimulationParameters from './SimulationParameters';
import ResultsCharts from './ResultsCharts';
import ORScheduleChart from './ORScheduleChart';
import GanttChart from './GanttChart';
import BlockScheduler from './BlockScheduler';
import ScenarioManager from './ScenarioManager';
import ReportExport from './ReportExport';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Block interface that extends ORBlock for UI components
interface Block extends ORBlock {
  label: string;
  allowedProcedures: string[];
}

// Convert Block to ORBlock for simulation
const convertBlockToORBlock = (block: Block): ORBlock => {
  return {
    id: block.id,
    orId: block.orId,
    start: block.start,
    end: block.end,
    allowedClasses: block.allowedProcedures, // Use allowedProcedures for compatibility
    day: block.day,
    label: block.label,
    allowedProcedures: block.allowedProcedures
  };
};

const SimulationDashboard: React.FC = () => {
  // Update params to include blocks
  const [params, setParams] = useState<SimulationParams>({
    ...defaultSimulationParams,
  });
  
  const [results, setResults] = useState<SimulationResults | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState("simulator");
  const [resultTab, setResultTab] = useState("metrics");
  const [activeConfigTab, setActiveConfigTab] = useState("parameters");

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

  // Handle block schedule changes
  const handleBlockScheduleChange = useCallback((blocks: Block[]) => {
    setParams(prev => {
      // Convert Block[] to ORBlock[] for the simulation
      const orBlocks: ORBlock[] = blocks.map(convertBlockToORBlock);
      
      return {
        ...prev,
        blockScheduleEnabled: true,
        orBlocks: orBlocks
      };
    });
  }, []);

  const runSimulationHandler = useCallback(() => {
    setIsRunning(true);
    // Use setTimeout to allow UI to update before running simulation
    setTimeout(() => {
      try {
        // Run simulation with current parameters
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

  // Load a scenario from ScenarioManager
  const handleLoadScenario = useCallback((scenario: { params: SimulationParams, results: SimulationResults | null }) => {
    setParams(scenario.params);
    setResults(scenario.results);
    setActiveTab("simulator");
    
    toast({
      title: "Skenaario ladattu",
      description: "Skenaario on ladattu simulaattoriin."
    });
  }, []);

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <Tabs defaultValue="simulator" value={activeTab} onValueChange={setActiveTab}>
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="simulator">Simulaattori</TabsTrigger>
            <TabsTrigger value="scenarios">Skenaariot</TabsTrigger>
            <TabsTrigger value="reports">Raportit</TabsTrigger>
            <TabsTrigger value="guide">Ohjeet</TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="simulator" className="space-y-6">
          {/* Configuration tabs */}
          <Tabs value={activeConfigTab} onValueChange={setActiveConfigTab}>
            <TabsList>
              <TabsTrigger value="parameters">Parametrit</TabsTrigger>
              <TabsTrigger value="or-blocks">Salisuunnittelu</TabsTrigger>
            </TabsList>
            
            <TabsContent value="parameters" className="pt-4">
              <SimulationParameters
                params={params}
                onParamChange={handleParamChange}
                onPatientDistributionChange={handlePatientDistributionChange}
                onRunSimulation={runSimulationHandler}
                isRunning={isRunning}
              />
            </TabsContent>
            
            <TabsContent value="or-blocks" className="pt-4">
              <BlockScheduler 
                patientClasses={params.patientClasses}
                onScheduleChange={handleBlockScheduleChange}
              />
              
              <div className="mt-4 flex justify-end">
                <button
                  onClick={runSimulationHandler}
                  disabled={isRunning}
                  className="bg-medical-blue text-white px-4 py-2 rounded hover:bg-opacity-90 disabled:opacity-50"
                >
                  {isRunning ? 'Simulaatio käynnissä...' : 'Aja simulaatio'}
                </button>
              </div>
            </TabsContent>
          </Tabs>
          
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
                  <TabsTrigger value="gantt">Gantt-kaavio</TabsTrigger>
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
                                b => {
                                  // Use both allowedClasses and allowedProcedures for compatibility
                                  const allowedPatients = b.allowedProcedures || b.allowedClasses;
                                  return allowedPatients.includes(pc.id);
                                }
                              ).length || 0;
                              
                              // Calculate total hours for this class
                              const totalHours = params.orBlocks?.reduce((sum, block) => {
                                const allowedPatients = block.allowedProcedures || block.allowedClasses;
                                if (allowedPatients.includes(pc.id)) {
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
                          
                          <div className="mt-6">
                            <h3 className="text-lg font-medium mb-3">OR blokit potilasluokittain</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              {params.orBlocks.map(block => {
                                const allowedPatientClasses = params.patientClasses.filter(pc => 
                                  (block.allowedProcedures || block.allowedClasses).includes(pc.id)
                                );
                                
                                return (
                                  <Card key={block.id}>
                                    <CardContent className="p-4">
                                      <div className="flex justify-between items-center">
                                        <span className="font-medium">{block.label || `Block ${block.id}`}</span>
                                        <span className="text-sm text-muted-foreground">{block.orId}</span>
                                      </div>
                                      <div className="mt-2 flex flex-wrap gap-1">
                                        {allowedPatientClasses.map(pc => (
                                          <Badge key={pc.id} style={{ backgroundColor: pc.color }}>
                                            {pc.name}
                                          </Badge>
                                        ))}
                                      </div>
                                    </CardContent>
                                  </Card>
                                );
                              })}
                            </div>
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
                
                <TabsContent value="gantt" className="pt-4">
                  <GanttChart 
                    surgeryList={params.customSurgeryList || []}
                    patientClasses={params.patientClasses}
                  />
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
          <ScenarioManager 
            currentParams={params}
            currentResults={results}
            onLoadScenario={handleLoadScenario}
          />
        </TabsContent>
        
        <TabsContent value="reports">
          <ReportExport 
            results={results}
            params={params}
            patientClasses={params.patientClasses}
          />
        </TabsContent>
        
        <TabsContent value="guide">
          <Card>
            <CardHeader>
              <CardTitle>Johdon työkalut PACU-simulaation hallintaan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-semibold">Simulaation tarkoitus</h3>
                <p>Tämän sovelluksen avulla voit mallintaa heräämön (PACU) toimintaa ja resurssitarpeita erilaisilla potilasmäärillä ja -tyypeillä. Sovellus on suunniteltu johdon tarpeisiin, mahdollistaen datapohjaisen päätöksenteon ja resurssien optimoinnin.</p>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-semibold">Uudet johdon ominaisuudet</h3>
                <p>Sovellus sisältää seuraavat työkalut johdon käyttöön:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Gantt-kaaviot visualisoivat leikkaussalien ja heräämön aikatauluja</li>
                  <li>Skenaarioiden vertailu auttaa näkemään eri vaihtoehtojen vaikutukset</li>
                  <li>Raporttien vienti mahdollistaa tulosten jakamisen johtoryhmien kokouksissa</li>
                  <li>Interaktiiviset visualisoinnit tukevat resurssien käytön optimointia</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-semibold">Skenaarioiden hallinta</h3>
                <p>Skenaarioiden hallintajärjestelmä mahdollistaa:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Skenaarioiden tallentamisen nimen, kuvauksen ja tagien kanssa</li>
                  <li>Skenaarioiden vertailun keskenään</li>
                  <li>Resurssitarpeiden arvioinnin eri potilasmäärillä</li>
                  <li>Pitkän aikavälin kapasiteettisuunnittelun</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-semibold">Raportointi</h3>
                <p>Voit luoda ja viedä raportteja:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Excel-muodossa (CSV) tarkempaa analyysia varten</li>
                  <li>PDF-muodossa esittämistä varten</li>
                  <li>Valitse, mitkä mittarit ja visualisoinnit sisällytetään raporttiin</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SimulationDashboard;
