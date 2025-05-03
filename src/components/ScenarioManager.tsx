
import React, { useState, useEffect } from 'react';
import { SimulationParams, SimulationResults } from '@/lib/simulation';
import { OptimizationParams } from '@/lib/optimizer';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface ScenarioManagerProps {
  currentParams: SimulationParams;
  currentResults: SimulationResults | null;
  currentOptParams?: OptimizationParams; // Add this prop
  currentBlocks?: any[]; // Add this prop
  currentSurgeryList?: any[]; // Add this prop
  currentScheduleType?: 'template' | 'custom'; // Add this prop
  onLoadScenario: (scenario: {
    params: SimulationParams;
    results: SimulationResults | null;
    optParams?: OptimizationParams; // Add to return type
    blocks?: any[]; // Add to return type
    surgeryList?: any[]; // Add to return type
    scheduleType?: 'template' | 'custom'; // Add to return type
  }) => void;
}

// Local storage key for scenarios
const SCENARIOS_STORAGE_KEY = 'pacu-simulator-scenarios';

// Interface for a saved scenario
interface SavedScenario {
  id: string;
  name: string;
  description: string;
  date: string;
  params: SimulationParams;
  results: SimulationResults | null;
  optParams?: OptimizationParams; // Add this field
  blocks?: any[]; // Add this field
  surgeryList?: any[]; // Add this field
  scheduleType?: 'template' | 'custom'; // Add this field
  tags?: string[];
}

const ScenarioManager: React.FC<ScenarioManagerProps> = ({
  currentParams,
  currentResults,
  currentOptParams, // Add this prop
  currentBlocks, // Add this prop
  currentSurgeryList, // Add this prop
  currentScheduleType, // Add this prop
  onLoadScenario,
}) => {
  const [scenarios, setScenarios] = useState<SavedScenario[]>([]);
  const [newScenarioName, setNewScenarioName] = useState('');
  const [newScenarioDescription, setNewScenarioDescription] = useState('');
  const [newScenarioTags, setNewScenarioTags] = useState('');
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);

  // Load scenarios from local storage on component mount
  useEffect(() => {
    const savedScenarios = localStorage.getItem(SCENARIOS_STORAGE_KEY);
    if (savedScenarios) {
      try {
        setScenarios(JSON.parse(savedScenarios));
      } catch (error) {
        console.error("Error loading scenarios from local storage:", error);
      }
    }
  }, []);

  // Save scenarios to local storage
  const saveScenarios = (updatedScenarios: SavedScenario[]) => {
    try {
      localStorage.setItem(SCENARIOS_STORAGE_KEY, JSON.stringify(updatedScenarios));
      setScenarios(updatedScenarios);
    } catch (error) {
      console.error("Error saving scenarios to local storage:", error);
    }
  };

  // Handle saving a new scenario
  const handleSaveScenario = () => {
    if (!newScenarioName.trim()) {
      return; // Don't save with empty name
    }

    const now = new Date();
    const newScenario: SavedScenario = {
      id: `scenario-${Date.now()}`,
      name: newScenarioName.trim(),
      description: newScenarioDescription.trim(),
      date: now.toISOString(),
      params: currentParams,
      results: currentResults,
      optParams: currentOptParams, // Save optParams
      blocks: currentBlocks, // Save blocks
      surgeryList: currentSurgeryList, // Save surgeryList
      scheduleType: currentScheduleType, // Save scheduleType
      tags: newScenarioTags.trim().split(',').map(tag => tag.trim()).filter(Boolean),
    };

    const updatedScenarios = [...scenarios, newScenario];
    saveScenarios(updatedScenarios);
    
    // Clear the form
    setNewScenarioName('');
    setNewScenarioDescription('');
    setNewScenarioTags('');
  };

  // Handle loading a scenario
  const handleLoadScenario = () => {
    if (!selectedScenarioId) return;
    
    const scenarioToLoad = scenarios.find(s => s.id === selectedScenarioId);
    if (!scenarioToLoad) return;
    
    onLoadScenario({
      params: scenarioToLoad.params,
      results: scenarioToLoad.results,
      optParams: scenarioToLoad.optParams, // Include optParams
      blocks: scenarioToLoad.blocks, // Include blocks
      surgeryList: scenarioToLoad.surgeryList, // Include surgeryList
      scheduleType: scenarioToLoad.scheduleType, // Include scheduleType
    });
  };

  // Handle deleting a scenario
  const handleDeleteScenario = () => {
    if (!selectedScenarioId) return;
    
    const updatedScenarios = scenarios.filter(s => s.id !== selectedScenarioId);
    saveScenarios(updatedScenarios);
    setSelectedScenarioId(null);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Tallenna uusi skenaario</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label htmlFor="scenario-name" className="text-sm font-medium">Skenaarion nimi</label>
              <Input
                id="scenario-name"
                value={newScenarioName}
                onChange={(e) => setNewScenarioName(e.target.value)}
                placeholder="Esim. Osastopohjaiset virtausmallit"
              />
            </div>
            <div>
              <label htmlFor="scenario-description" className="text-sm font-medium">Kuvaus</label>
              <Input
                id="scenario-description"
                value={newScenarioDescription}
                onChange={(e) => setNewScenarioDescription(e.target.value)}
                placeholder="Skenaarion tarkempi kuvaus..."
              />
            </div>
            <div>
              <label htmlFor="scenario-tags" className="text-sm font-medium">Tagit (pilkulla erotettuna)</label>
              <Input
                id="scenario-tags"
                value={newScenarioTags}
                onChange={(e) => setNewScenarioTags(e.target.value)}
                placeholder="Esim. osastot, pacu, optimointi"
              />
            </div>
            <div className="pt-2">
              <Button onClick={handleSaveScenario} className="w-full">Tallenna skenaario</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tallennetut skenaariot</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {scenarios.length > 0 ? (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {scenarios.map((scenario) => (
                  <div 
                    key={scenario.id} 
                    className={`p-3 border rounded-md cursor-pointer ${selectedScenarioId === scenario.id ? 'border-primary bg-primary/10' : 'border-border'}`}
                    onClick={() => setSelectedScenarioId(scenario.id)}
                  >
                    <div className="flex justify-between items-start">
                      <h3 className="font-medium">{scenario.name}</h3>
                      <span className="text-xs text-muted-foreground">
                        {new Date(scenario.date).toLocaleDateString()}
                      </span>
                    </div>
                    {scenario.description && (
                      <p className="text-sm text-muted-foreground mt-1">{scenario.description}</p>
                    )}
                    {scenario.tags && scenario.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {scenario.tags.map((tag, i) => (
                          <Badge key={i} variant="outline" className="text-xs">{tag}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground">Ei tallennettuja skenaarioita.</p>
            )}

            {scenarios.length > 0 && (
              <div className="flex space-x-2 pt-2">
                <Button onClick={handleLoadScenario} disabled={!selectedScenarioId} className="flex-1">
                  Lataa valittu
                </Button>
                <Button onClick={handleDeleteScenario} disabled={!selectedScenarioId} variant="destructive" className="flex-1">
                  Poista valittu
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ScenarioManager;
