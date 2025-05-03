
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OptimizationParams } from '@/lib/optimizer';

interface OptimizationSettingsProps {
  optParams: OptimizationParams;
  onOptParamChange: (key: keyof OptimizationParams, value: any) => void;
}

const OptimizationSettings: React.FC<OptimizationSettingsProps> = ({ optParams, onOptParamChange }) => {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Optimoinnin asetukset</CardTitle>
        <CardDescription>
          Säädä optimoinnin painokertoimia ja algoritmin asetuksia
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Painokertoimet</h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="alpha-weight">Ruuhkahuipun optimointi (α)</Label>
                <span className="text-sm font-medium">{optParams.alpha.toFixed(2)}</span>
              </div>
              <Slider 
                id="alpha-weight"
                min={0} 
                max={5} 
                step={0.1} 
                value={[optParams.alpha]} 
                onValueChange={([value]) => onOptParamChange('alpha', value)} 
                className="w-full"
              />
              <p className="text-sm text-muted-foreground">
                Korkeampi arvo vähentää PACU-ruuhkahuippuja tasaamalla potilaiden saapumista
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="beta-weight">Hoitajaresurssien optimointi (β)</Label>
                <span className="text-sm font-medium">{optParams.beta.toFixed(2)}</span>
              </div>
              <Slider 
                id="beta-weight"
                min={0} 
                max={5} 
                step={0.1} 
                value={[optParams.beta]} 
                onValueChange={([value]) => onOptParamChange('beta', value)} 
                className="w-full"
              />
              <p className="text-sm text-muted-foreground">
                Korkeampi arvo vähentää hoitajien käyttöasteen vaihtelua ja ylityötarvetta
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="gamma-weight">Kustannusten optimointi (γ)</Label>
                <span className="text-sm font-medium">{optParams.gamma.toFixed(2)}</span>
              </div>
              <Slider 
                id="gamma-weight"
                min={0} 
                max={5} 
                step={0.1} 
                value={[optParams.gamma]} 
                onValueChange={([value]) => onOptParamChange('gamma', value)} 
                className="w-full"
              />
              <p className="text-sm text-muted-foreground">
                Korkeampi arvo painottaa kokonaiskustannusten minimointia (OR, PACU, hoitajat)
              </p>
            </div>
          </div>
        </div>
        
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Algoritmin asetukset</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="max-iterations">Maksimi iteraatiomäärä</Label>
              <Input
                id="max-iterations"
                type="number"
                min={100}
                max={10000}
                step={100}
                value={optParams.maxIterations}
                onChange={(e) => onOptParamChange('maxIterations', parseInt(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                Suurempi arvo tuottaa parempia tuloksia mutta on hitaampi (500-2000 suositeltava)
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="initial-temp">Alkuarvoinen lämpötila</Label>
              <Input
                id="initial-temp"
                type="number"
                min={100}
                max={10000}
                step={100}
                value={optParams.initialTemperature}
                onChange={(e) => onOptParamChange('initialTemperature', parseInt(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                Korkeampi lämpötila lisää optimoinnin alkuvaiheen satunnaisuutta (1000 tyypillinen)
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="cooling-rate">Jäähdytysaste</Label>
              <Input
                id="cooling-rate"
                type="number"
                min={0.8}
                max={0.999}
                step={0.001}
                value={optParams.coolingRate}
                onChange={(e) => onOptParamChange('coolingRate', parseFloat(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                Määrittää kuinka nopeasti algoritmi vakiintuu (0.95-0.99 tyypillinen)
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default OptimizationSettings;
