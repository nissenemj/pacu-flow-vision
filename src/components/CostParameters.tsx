
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
            <Label htmlFor="orCostPerMinute">OR-kustannus (€/min)</Label>
            <Input
              id="orCostPerMinute"
              type="number"
              step="0.01"
              value={costParams.orCostPerMinute}
              onChange={(e) => handleCostChange('orCostPerMinute', e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Leikkaussalin käyttökustannus per minuutti</p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="pacuPhase1CostPerMinute">PACU Phase I -kustannus (€/min)</Label>
            <Input
              id="pacuPhase1CostPerMinute"
              type="number"
              step="0.01"
              value={costParams.pacuPhase1CostPerMinute}
              onChange={(e) => handleCostChange('pacuPhase1CostPerMinute', e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Heräämön Phase I -vuodepaikan kustannus per minuutti</p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="pacuPhase2CostPerMinute">PACU Phase II -kustannus (€/min)</Label>
            <Input
              id="pacuPhase2CostPerMinute"
              type="number"
              step="0.01"
              value={costParams.pacuPhase2CostPerMinute}
              onChange={(e) => handleCostChange('pacuPhase2CostPerMinute', e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Heräämön Phase II -vuodepaikan kustannus per minuutti</p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="nurseCostPerMinute">Hoitajakustannus (€/min)</Label>
            <Input
              id="nurseCostPerMinute"
              type="number"
              step="0.01"
              value={costParams.nurseCostPerMinute}
              onChange={(e) => handleCostChange('nurseCostPerMinute', e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Hoitajan työajan kustannus per minuutti</p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="wardBedCostPerMinute">Vuodeosasto (€/min)</Label>
            <Input
              id="wardBedCostPerMinute"
              type="number"
              step="0.01"
              value={costParams.wardBedCostPerMinute}
              onChange={(e) => handleCostChange('wardBedCostPerMinute', e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Vuodeosaston vuodepaikan kustannus per minuutti</p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="cancellationCost">Peruutuksen kustannus (€)</Label>
            <Input
              id="cancellationCost"
              type="number"
              step="1"
              value={costParams.cancellationCost}
              onChange={(e) => handleCostChange('cancellationCost', e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Kustannus leikkauksen peruutuksesta</p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="overtimeMultiplier">Ylityökerroin</Label>
            <Input
              id="overtimeMultiplier"
              type="number"
              step="0.1"
              min="1"
              value={costParams.overtimeMultiplier || 1.5}
              onChange={(e) => handleCostChange('overtimeMultiplier', e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Ylityötuntien kustannuskerroin (esim. 1.5 = 50% lisää)</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CostParameters;
