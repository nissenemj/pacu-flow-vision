import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { PatientClass, SimulationParams, SurgeryCase } from '@/lib/simulation';
import { Button } from '@/components/ui/button';
import { PlayCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SurgeryScheduler from './SurgeryScheduler';
import BlockScheduler from './BlockScheduler';

interface SimulationParametersProps {
  params: SimulationParams;
  onParamChange: (key: string, value: any) => void;
  onPatientDistributionChange: (classId: string, value: number) => void;
  onRunSimulation: () => void;
  isRunning: boolean;
}

const SimulationParameters: React.FC<SimulationParametersProps> = ({
  params,
  onParamChange,
  onPatientDistributionChange,
  onRunSimulation,
  isRunning
}) => {
  // Calculate total percentage for patient distribution
  const totalPercentage = Object.values(params.patientClassDistribution).reduce((sum, val) => sum + val, 0);
  const isValidDistribution = Math.abs(totalPercentage - 1.0) < 0.01; // Allow small rounding errors
  
  // Handle surgery list generation
  const handleSurgeryListGenerated = (surgeryList: SurgeryCase[]) => {
    onParamChange('customSurgeryList', surgeryList);
  };
  
  // Handle schedule type change
  const handleScheduleTypeChange = (type: 'template' | 'custom') => {
    onParamChange('surgeryScheduleType', type);
  };
  
  // Handle OR block schedule change
  const handleBlockScheduleChange = (blocks: any[]) => {
    onParamChange('orBlocks', blocks);
  };

  const [activeTab, setActiveTab] = useState("resources");
  
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Tabs 
        defaultValue="resources" 
        value={activeTab}
        onValueChange={setActiveTab}
        className="col-span-2 space-y-4"
      >
        <TabsList>
          <TabsTrigger value="resources">Resurssit</TabsTrigger>
          <TabsTrigger value="patients">Potilasjakauma</TabsTrigger>
          <TabsTrigger value="schedule">Leikkauslista</TabsTrigger>
          <TabsTrigger value="blocks">Salisuunnittelu</TabsTrigger>
        </TabsList>
        
        <TabsContent value="resources">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Resurssit ja asetukset</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="beds">Vuodepaikat</Label>
                    <div className="flex items-center gap-2">
                      <Slider
                        id="beds"
                        min={4}
                        max={20}
                        step={1}
                        value={[params.beds]}
                        onValueChange={(value) => onParamChange('beds', value[0])}
                        className="flex-1"
                      />
                      <span className="w-8 text-center">{params.beds}</span>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="nurses">Hoitajat/vuoro</Label>
                    <div className="flex items-center gap-2">
                      <Slider
                        id="nurses"
                        min={2}
                        max={15}
                        step={1}
                        value={[params.nurses]}
                        onValueChange={(value) => onParamChange('nurses', value[0])}
                        className="flex-1"
                      />
                      <span className="w-8 text-center">{params.nurses}</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="nursePatientRatio">Hoitaja:potilas-suhde</Label>
                  <div className="flex items-center gap-2">
                    <span>1:</span>
                    <Slider
                      id="nursePatientRatio"
                      min={1}
                      max={4}
                      step={0.5}
                      value={[params.nursePatientRatio]}
                      onValueChange={(value) => onParamChange('nursePatientRatio', value[0])}
                      className="flex-1"
                    />
                    <span className="w-8 text-center">{params.nursePatientRatio}</span>
                  </div>
                </div>
                
                {params.surgeryScheduleType === 'template' && (
                  <div>
                    <Label htmlFor="surgeries">Leikkauksia/päivä</Label>
                    <div className="flex items-center gap-2">
                      <Slider
                        id="surgeries"
                        min={5}
                        max={50}
                        step={1}
                        value={[params.surgeryScheduleTemplate.averageDailySurgeries]}
                        onValueChange={(value) => onParamChange('averageDailySurgeries', value[0])}
                        className="flex-1"
                      />
                      <span className="w-8 text-center">{params.surgeryScheduleTemplate.averageDailySurgeries}</span>
                    </div>
                  </div>
                )}
                
                <div>
                  <Label htmlFor="days">Simuloitavat päivät</Label>
                  <div className="flex items-center gap-2">
                    <Slider
                      id="days"
                      min={7}
                      max={90}
                      step={1}
                      value={[params.simulationDays]}
                      onValueChange={(value) => onParamChange('simulationDays', value[0])}
                      className="flex-1"
                    />
                    <span className="w-10 text-center">{params.simulationDays}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="patients">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Potilasluokkajakauma</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {params.patientClasses.map((patientClass: PatientClass) => (
                  <div key={patientClass.id}>
                    <div className="flex items-center justify-between mb-1">
                      <Label 
                        htmlFor={`class-${patientClass.id}`}
                        className="flex items-center gap-2"
                      >
                        <span 
                          className="block w-3 h-3 rounded-full" 
                          style={{ backgroundColor: patientClass.color }}
                        />
                        {patientClass.name}
                      </Label>
                      <span className="text-sm">
                        {Math.round(params.patientClassDistribution[patientClass.id] * 100)}%
                      </span>
                    </div>
                    <Slider
                      id={`class-${patientClass.id}`}
                      min={0}
                      max={1}
                      step={0.01}
                      value={[params.patientClassDistribution[patientClass.id]]}
                      onValueChange={(value) => onPatientDistributionChange(patientClass.id, value[0])}
                      className="flex-1"
                    />
                  </div>
                ))}
                
                <div className="pt-2">
                  <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden flex">
                    {params.patientClasses.map((patientClass: PatientClass) => (
                      <div 
                        key={patientClass.id}
                        style={{ 
                          backgroundColor: patientClass.color,
                          width: `${params.patientClassDistribution[patientClass.id] * 100}%` 
                        }}
                        className="h-full"
                      />
                    ))}
                  </div>
                  {!isValidDistribution && (
                    <p className="text-red-500 text-sm mt-2">
                      Yhteensä: {Math.round(totalPercentage * 100)}%. Summan pitäisi olla 100%.
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="schedule">
          <SurgeryScheduler
            patientClasses={params.patientClasses}
            patientDistribution={params.patientClassDistribution}
            simulationDays={params.simulationDays}
            onScheduleGenerated={handleSurgeryListGenerated}
            onScheduleTypeChange={handleScheduleTypeChange}
          />
        </TabsContent>
        
        <TabsContent value="blocks">
          <BlockScheduler 
            patientClasses={params.patientClasses}
            onScheduleChange={handleBlockScheduleChange}
          />
        </TabsContent>
        
        <div className="pt-4">
          <Button
            onClick={onRunSimulation}
            disabled={isRunning || !isValidDistribution}
            className="w-full"
          >
            <PlayCircle className="mr-2 h-4 w-4" />
            {isRunning ? 'Simulaatio käynnissä...' : 'Aloita simulaatio'}
          </Button>
        </div>
      </Tabs>
    </div>
  );
};

export default SimulationParameters;
