
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SimulationParams } from '@/lib/simulation';

interface CostParametersProps {
  costParams: SimulationParams['costParams'];
  onCostParamsChange: (updatedCostParams: Partial<SimulationParams['costParams']>) => void;
}

const CostParameters: React.FC<CostParametersProps> = ({ costParams, onCostParamsChange }) => {
  const handleCostChange = (key: keyof SimulationParams['costParams'], value: string) => {
    const numericValue = parseFloat(value);
    if (!isNaN(numericValue)) {
      onCostParamsChange({ [key]: numericValue });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Kustannusparametrit</CardTitle>
        <CardDescription>
          Määritä resurssien kustannukset simulaatiota varten
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="costPerORMinute">OR-kustannus (€/min)</Label>
            <Input
              id="costPerORMinute"
              type="number"
              step="0.01"
              value={costParams.costPerORMinute}
              onChange={(e) => handleCostChange('costPerORMinute', e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Leikkaussalin käyttökustannus per minuutti</p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="costPerPacuPhase1Minute">PACU Phase I -kustannus (€/min)</Label>
            <Input
              id="costPerPacuPhase1Minute"
              type="number"
              step="0.01"
              value={costParams.costPerPacuPhase1Minute}
              onChange={(e) => handleCostChange('costPerPacuPhase1Minute', e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Heräämön Phase I -vuodepaikan kustannus per minuutti</p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="costPerPacuPhase2Minute">PACU Phase II -kustannus (€/min)</Label>
            <Input
              id="costPerPacuPhase2Minute"
              type="number"
              step="0.01"
              value={costParams.costPerPacuPhase2Minute}
              onChange={(e) => handleCostChange('costPerPacuPhase2Minute', e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Heräämön Phase II -vuodepaikan kustannus per minuutti</p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="costPerNurseMinute">Hoitajakustannus (€/min)</Label>
            <Input
              id="costPerNurseMinute"
              type="number"
              step="0.01"
              value={costParams.costPerNurseMinute}
              onChange={(e) => handleCostChange('costPerNurseMinute', e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Hoitajan työajan kustannus per minuutti</p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="costPerWardBedMinute">Vuodeosasto (€/min)</Label>
            <Input
              id="costPerWardBedMinute"
              type="number"
              step="0.01"
              value={costParams.costPerWardBedMinute}
              onChange={(e) => handleCostChange('costPerWardBedMinute', e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Vuodeosaston vuodepaikan kustannus per minuutti</p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="costPerCancellation">Peruutuksen kustannus (€)</Label>
            <Input
              id="costPerCancellation"
              type="number"
              step="1"
              value={costParams.costPerCancellation}
              onChange={(e) => handleCostChange('costPerCancellation', e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Kustannus leikkauksen peruutuksesta</p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="overtimeCostMultiplier">Ylityökerroin</Label>
            <Input
              id="overtimeCostMultiplier"
              type="number"
              step="0.1"
              min="1"
              value={costParams.overtimeCostMultiplier || 1.5}
              onChange={(e) => handleCostChange('overtimeCostMultiplier', e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Ylityötuntien kustannuskerroin (esim. 1.5 = 50% lisää)</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CostParameters;
