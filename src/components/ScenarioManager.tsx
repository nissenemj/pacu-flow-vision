
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from '@/components/ui/use-toast';
import { SimulationResults, SimulationParams } from '@/lib/simulation';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface Scenario {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
  params: SimulationParams;
  results: SimulationResults | null;
  tags: string[];
}

interface ScenarioManagerProps {
  currentParams: SimulationParams;
  currentResults: SimulationResults | null;
  onLoadScenario: (scenario: Scenario) => void;
}

const ScenarioManager: React.FC<ScenarioManagerProps> = ({
  currentParams,
  currentResults,
  onLoadScenario
}) => {
  const [scenarios, setScenarios] = useState<Scenario[]>(() => {
    // Try to load scenarios from localStorage
    const savedScenarios = localStorage.getItem('simulation_scenarios');
    if (savedScenarios) {
      try {
        // Convert dates from strings back to Date objects
        const parsed = JSON.parse(savedScenarios);
        return parsed.map((scenario: any) => ({
          ...scenario,
          createdAt: new Date(scenario.createdAt)
        }));
      } catch (e) {
        console.error("Error parsing saved scenarios:", e);
        return [];
      }
    }
    return [];
  });
  
  const [selectedScenarios, setSelectedScenarios] = useState<string[]>([]);
  const [isComparing, setIsComparing] = useState(false);
  const [newScenarioName, setNewScenarioName] = useState('');
  const [newScenarioDesc, setNewScenarioDesc] = useState('');
  const [newScenarioTags, setNewScenarioTags] = useState('');
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  
  // Save scenarios to localStorage whenever they change
  React.useEffect(() => {
    localStorage.setItem('simulation_scenarios', JSON.stringify(scenarios));
  }, [scenarios]);
  
  const saveCurrentScenario = () => {
    if (!currentResults) {
      toast({
        title: "Ei tuloksia tallennettavaksi",
        description: "Aja simulaatio ensin nähdäksesi tulokset.",
        variant: "destructive"
      });
      return;
    }
    
    if (!newScenarioName.trim()) {
      toast({
        title: "Nimi vaaditaan",
        description: "Anna skenaariolle nimi.",
        variant: "destructive"
      });
      return;
    }
    
    const tags = newScenarioTags.split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);
    
    const newScenario: Scenario = {
      id: `scenario_${Date.now()}`,
      name: newScenarioName,
      description: newScenarioDesc,
      createdAt: new Date(),
      params: { ...currentParams },
      results: { ...currentResults },
      tags
    };
    
    setScenarios(prev => [...prev, newScenario]);
    setNewScenarioName('');
    setNewScenarioDesc('');
    setNewScenarioTags('');
    setSaveDialogOpen(false);
    
    toast({
      title: "Skenaario tallennettu",
      description: `Skenaario "${newScenarioName}" on tallennettu.`
    });
  };
  
  const deleteScenario = (id: string) => {
    setScenarios(prev => prev.filter(s => s.id !== id));
    setSelectedScenarios(prev => prev.filter(sId => sId !== id));
    toast({
      title: "Skenaario poistettu",
      description: "Skenaario on poistettu onnistuneesti."
    });
  };
  
  const toggleScenarioSelection = (id: string) => {
    setSelectedScenarios(prev => {
      if (prev.includes(id)) {
        return prev.filter(sId => sId !== id);
      } else {
        // Limit to 3 selections
        if (prev.length >= 3) {
          toast({
            title: "Maksimi vertailu",
            description: "Voit vertailla enintään kolmea skenaariota kerrallaan.",
            variant: "destructive"
          });
          return prev;
        }
        return [...prev, id];
      }
    });
  };
  
  const startComparison = () => {
    if (selectedScenarios.length < 2) {
      toast({
        title: "Valitse vähintään kaksi",
        description: "Vertailuun tarvitaan vähintään kaksi skenaariota.",
        variant: "destructive"
      });
      return;
    }
    
    setIsComparing(true);
  };
  
  const cancelComparison = () => {
    setIsComparing(false);
    setSelectedScenarios([]);
  };
  
  // Format comparison data for charts
  const prepareComparisonData = () => {
    const selectedScenarioObjects = scenarios.filter(s => 
      selectedScenarios.includes(s.id)
    );
    
    // Bed occupancy comparison
    const bedOccupancyData = selectedScenarioObjects.map(s => ({
      name: s.name,
      "Keskimääräinen käyttöaste": Math.round(s.results?.meanBedOccupancy * 100) || 0,
      "Maksimi käyttöaste": Math.round(s.results?.maxBedOccupancy * 100) || 0
    }));
    
    // Wait time comparison
    const waitTimeData = selectedScenarioObjects.map(s => ({
      name: s.name,
      "Keskimääräinen odotus": Math.round(s.results?.meanWaitTime) || 0,
      "95. persentiili odotus": Math.round(s.results?.p95WaitTime) || 0
    }));
    
    // Resource comparison
    const resourceData = selectedScenarioObjects.map(s => ({
      name: s.name,
      "Vuodepaikat": s.params.beds,
      "Hoitajat": s.params.nurses
    }));
    
    return {
      bedOccupancyData,
      waitTimeData,
      resourceData
    };
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Skenaarioiden hallinta</h2>
        <div className="flex space-x-2">
          <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
            <DialogTrigger asChild>
              <Button>Tallenna nykyinen skenaario</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Tallenna skenaario</DialogTitle>
                <DialogDescription>
                  Anna skenaariolle nimi, kuvaus ja tagit helpottaaksesi sen löytämistä myöhemmin.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div>
                  <Label htmlFor="name">Nimi</Label>
                  <Input 
                    id="name" 
                    value={newScenarioName} 
                    onChange={e => setNewScenarioName(e.target.value)}
                    placeholder="Esim. Perusskenaario 3 hoitajalla"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Kuvaus</Label>
                  <Textarea 
                    id="description" 
                    value={newScenarioDesc} 
                    onChange={e => setNewScenarioDesc(e.target.value)}
                    placeholder="Kuvaile skenaarion tarkoitus ja parametrit"
                  />
                </div>
                <div>
                  <Label htmlFor="tags">Tagit (pilkulla erotettuna)</Label>
                  <Input 
                    id="tags" 
                    value={newScenarioTags} 
                    onChange={e => setNewScenarioTags(e.target.value)}
                    placeholder="Esim. perus, 3 hoitajaa, korkea potilasvirta"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>Peruuta</Button>
                <Button onClick={saveCurrentScenario}>Tallenna</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          {selectedScenarios.length > 0 && !isComparing && (
            <Button variant="outline" onClick={startComparison}>
              Vertaile valittuja ({selectedScenarios.length})
            </Button>
          )}
          
          {isComparing && (
            <Button variant="outline" onClick={cancelComparison}>
              Peruuta vertailu
            </Button>
          )}
        </div>
      </div>

      {isComparing ? (
        <div className="space-y-6">
          <h3 className="text-xl font-semibold">Skenaarioiden vertailu</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Bed Occupancy Comparison */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Vuodekäyttöaste</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={prepareComparisonData().bedOccupancyData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis unit="%" />
                    <Tooltip formatter={(value) => [`${value}%`, ""]} />
                    <Legend />
                    <Bar dataKey="Keskimääräinen käyttöaste" fill="#0ea5e9" />
                    <Bar dataKey="Maksimi käyttöaste" fill="#f43f5e" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            {/* Wait Time Comparison */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Odotusajat</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={prepareComparisonData().waitTimeData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis unit="min" />
                    <Tooltip formatter={(value) => [`${value} min`, ""]} />
                    <Legend />
                    <Bar dataKey="Keskimääräinen odotus" fill="#22c55e" />
                    <Bar dataKey="95. persentiili odotus" fill="#f97316" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            {/* Resource Comparison */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">Resurssit</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={prepareComparisonData().resourceData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Vuodepaikat" fill="#8884d8" />
                    <Bar dataKey="Hoitajat" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {scenarios.length === 0 ? (
            <Card className="md:col-span-2 lg:col-span-3">
              <CardContent className="flex items-center justify-center h-40">
                <p className="text-muted-foreground">
                  Ei tallennettuja skenaarioita. Aja simulaatio ja tallenna skenaario nähdäksesi sen täällä.
                </p>
              </CardContent>
            </Card>
          ) : (
            scenarios.map((scenario) => (
              <Card key={scenario.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{scenario.name}</CardTitle>
                    <Checkbox 
                      checked={selectedScenarios.includes(scenario.id)}
                      onCheckedChange={() => toggleScenarioSelection(scenario.id)}
                      className="ml-2"
                    />
                  </div>
                  <CardDescription className="flex items-center gap-2">
                    {new Date(scenario.createdAt).toLocaleDateString('fi-FI')}
                    <span className="text-xs text-muted-foreground">
                      ({scenario.params.beds} vuodetta, {scenario.params.nurses} hoitajaa)
                    </span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {scenario.description && (
                    <p className="text-sm mb-3">{scenario.description}</p>
                  )}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Vuodekäyttö:</span>
                      <span className="font-medium">
                        {Math.round(scenario.results?.meanBedOccupancy * 100)}%
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Odotusaika:</span>
                      <span className="font-medium">
                        {Math.round(scenario.results?.meanWaitTime)} min
                      </span>
                    </div>
                  </div>
                  {scenario.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {scenario.tags.map((tag, i) => (
                        <Badge key={i} variant="outline" className="text-xs">{tag}</Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button variant="outline" size="sm" onClick={() => onLoadScenario(scenario)}>
                    Lataa
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => deleteScenario(scenario.id)}>
                    Poista
                  </Button>
                </CardFooter>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default ScenarioManager;
