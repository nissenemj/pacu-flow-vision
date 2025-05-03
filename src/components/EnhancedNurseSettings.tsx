import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { NurseShift, NurseSkill, StaffParams } from '@/lib/simulation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusCircle, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface EnhancedNurseSettingsProps {
  staffParams: StaffParams;
  onStaffParamsChange: (key: string, value: any) => void;
  onNurseSkillChange: (index: number, key: string, value: any) => void;
  onNurseShiftChange: (index: number, key: string, value: any) => void;
  onAddNurseSkill: () => void;
  onRemoveNurseSkill: (index: number) => void;
  onAddNurseShift: () => void;
  onRemoveNurseShift: (index: number) => void;
  onShiftNursesPerDayChange: (shiftIndex: number, dayIndex: number, value: number) => void;
  onSkillDistributionChange: (shiftIndex: number, skillId: string, value: number) => void;
}

const EnhancedNurseSettings: React.FC<EnhancedNurseSettingsProps> = ({
  staffParams,
  onStaffParamsChange,
  onNurseSkillChange,
  onNurseShiftChange,
  onAddNurseSkill,
  onRemoveNurseSkill,
  onAddNurseShift,
  onRemoveNurseShift,
  onShiftNursesPerDayChange,
  onSkillDistributionChange
}) => {
  const daysOfWeek = ['Ma', 'Ti', 'Ke', 'To', 'Pe', 'La', 'Su'];
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Hoitajamalli</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="useEnhancedNurseModel"
              checked={staffParams.useEnhancedNurseModel}
              onCheckedChange={(checked) => onStaffParamsChange('useEnhancedNurseModel', checked)}
            />
            <Label htmlFor="useEnhancedNurseModel">Käytä parannettua hoitajamallia</Label>
          </div>
          
          {staffParams.useEnhancedNurseModel && (
            <Tabs defaultValue="skills" className="mt-4">
              <TabsList>
                <TabsTrigger value="skills">Taitotasot</TabsTrigger>
                <TabsTrigger value="shifts">Työvuorot</TabsTrigger>
                <TabsTrigger value="general">Yleiset</TabsTrigger>
              </TabsList>
              
              <TabsContent value="skills" className="space-y-4 mt-4">
                {staffParams.nurseSkills.map((skill, index) => (
                  <Card key={index} className="p-4 relative">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="absolute top-2 right-2 h-6 w-6"
                      onClick={() => onRemoveNurseSkill(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor={`skill-id-${index}`}>ID</Label>
                        <Input
                          id={`skill-id-${index}`}
                          value={skill.id}
                          onChange={(e) => onNurseSkillChange(index, 'id', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`skill-name-${index}`}>Nimi</Label>
                        <Input
                          id={`skill-name-${index}`}
                          value={skill.name}
                          onChange={(e) => onNurseSkillChange(index, 'name', e.target.value)}
                        />
                      </div>
                    </div>
                    
                    <div className="mt-4 grid grid-cols-2 gap-4">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id={`skill-phase1-${index}`}
                          checked={skill.canHandlePhase1}
                          onCheckedChange={(checked) => onNurseSkillChange(index, 'canHandlePhase1', checked)}
                        />
                        <Label htmlFor={`skill-phase1-${index}`}>Voi hoitaa PACU1</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id={`skill-phase2-${index}`}
                          checked={skill.canHandlePhase2}
                          onCheckedChange={(checked) => onNurseSkillChange(index, 'canHandlePhase2', checked)}
                        />
                        <Label htmlFor={`skill-phase2-${index}`}>Voi hoitaa PACU2</Label>
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      <Label htmlFor={`skill-efficiency-${index}`}>
                        Tehokkuuskerroin: {skill.efficiencyMultiplier.toFixed(1)}
                      </Label>
                      <Slider
                        id={`skill-efficiency-${index}`}
                        min={0.5}
                        max={2.0}
                        step={0.1}
                        value={[skill.efficiencyMultiplier]}
                        onValueChange={(value) => onNurseSkillChange(index, 'efficiencyMultiplier', value[0])}
                      />
                    </div>
                  </Card>
                ))}
                
                <Button onClick={onAddNurseSkill} className="w-full">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Lisää taitotaso
                </Button>
              </TabsContent>
              
              <TabsContent value="shifts" className="space-y-4 mt-4">
                {staffParams.nurseShifts.map((shift, index) => (
                  <Card key={index} className="p-4 relative">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="absolute top-2 right-2 h-6 w-6"
                      onClick={() => onRemoveNurseShift(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor={`shift-id-${index}`}>ID</Label>
                        <Input
                          id={`shift-id-${index}`}
                          value={shift.id}
                          onChange={(e) => onNurseShiftChange(index, 'id', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`shift-name-${index}`}>Nimi</Label>
                        <Input
                          id={`shift-name-${index}`}
                          value={shift.name}
                          onChange={(e) => onNurseShiftChange(index, 'name', e.target.value)}
                        />
                      </div>
                    </div>
                    
                    <div className="mt-4 grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor={`shift-start-${index}`}>Alkuaika (min)</Label>
                        <Input
                          id={`shift-start-${index}`}
                          type="number"
                          value={shift.startMinute}
                          onChange={(e) => onNurseShiftChange(index, 'startMinute', parseInt(e.target.value))}
                        />
                        <span className="text-xs text-gray-500">
                          {Math.floor(shift.startMinute / 60)}:{(shift.startMinute % 60).toString().padStart(2, '0')}
                        </span>
                      </div>
                      <div>
                        <Label htmlFor={`shift-duration-${index}`}>Kesto (min)</Label>
                        <Input
                          id={`shift-duration-${index}`}
                          type="number"
                          value={shift.durationMinutes}
                          onChange={(e) => onNurseShiftChange(index, 'durationMinutes', parseInt(e.target.value))}
                        />
                        <span className="text-xs text-gray-500">
                          {Math.floor(shift.durationMinutes / 60)} tuntia
                        </span>
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      <Label>Hoitajia per päivä</Label>
                      <div className="grid grid-cols-7 gap-2 mt-2">
                        {daysOfWeek.map((day, dayIndex) => (
                          <div key={dayIndex} className="text-center">
                            <Label htmlFor={`shift-day-${index}-${dayIndex}`} className="text-xs">
                              {day}
                            </Label>
                            <Input
                              id={`shift-day-${index}-${dayIndex}`}
                              type="number"
                              className="h-8 text-center"
                              value={shift.nursesPerDay[dayIndex]}
                              onChange={(e) => onShiftNursesPerDayChange(index, dayIndex, parseInt(e.target.value))}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      <Label>Taitotasojakauma</Label>
                      <div className="grid grid-cols-2 gap-4 mt-2">
                        {staffParams.nurseSkills.map((skill) => (
                          <div key={skill.id} className="flex flex-col">
                            <Label htmlFor={`shift-skill-${index}-${skill.id}`} className="text-xs">
                              {skill.name}
                            </Label>
                            <div className="flex items-center gap-2">
                              <Slider
                                id={`shift-skill-${index}-${skill.id}`}
                                min={0}
                                max={1}
                                step={0.05}
                                value={[shift.skillDistribution[skill.id] || 0]}
                                onValueChange={(value) => onSkillDistributionChange(index, skill.id, value[0])}
                              />
                              <span className="text-xs w-10">
                                {Math.round((shift.skillDistribution[skill.id] || 0) * 100)}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card>
                ))}
                
                <Button onClick={onAddNurseShift} className="w-full">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Lisää työvuoro
                </Button>
              </TabsContent>
              
              <TabsContent value="general" className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="totalNurses">Hoitajien kokonaismäärä</Label>
                  <div className="flex items-center gap-2">
                    <Slider
                      id="totalNurses"
                      min={5}
                      max={50}
                      step={1}
                      value={[staffParams.totalNurses]}
                      onValueChange={(value) => onStaffParamsChange('totalNurses', value[0])}
                      className="flex-1"
                    />
                    <span className="w-8 text-center">{staffParams.totalNurses}</span>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="phase1NurseRatio">PACU1 hoitaja:potilas-suhde</Label>
                  <div className="flex items-center gap-2">
                    <span>1:</span>
                    <Slider
                      id="phase1NurseRatio"
                      min={1}
                      max={3}
                      step={0.5}
                      value={[staffParams.phase1NurseRatio]}
                      onValueChange={(value) => onStaffParamsChange('phase1NurseRatio', value[0])}
                      className="flex-1"
                    />
                    <span className="w-8 text-center">{staffParams.phase1NurseRatio}</span>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="phase2NurseRatio">PACU2 hoitaja:potilas-suhde</Label>
                  <div className="flex items-center gap-2">
                    <span>1:</span>
                    <Slider
                      id="phase2NurseRatio"
                      min={1}
                      max={4}
                      step={0.5}
                      value={[staffParams.phase2NurseRatio]}
                      onValueChange={(value) => onStaffParamsChange('phase2NurseRatio', value[0])}
                      className="flex-1"
                    />
                    <span className="w-8 text-center">{staffParams.phase2NurseRatio}</span>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="overtimeMultiplier">Ylityökerroin</Label>
                  <div className="flex items-center gap-2">
                    <Slider
                      id="overtimeMultiplier"
                      min={1.0}
                      max={3.0}
                      step={0.1}
                      value={[staffParams.overtimeMultiplier]}
                      onValueChange={(value) => onStaffParamsChange('overtimeMultiplier', value[0])}
                      className="flex-1"
                    />
                    <span className="w-8 text-center">{staffParams.overtimeMultiplier.toFixed(1)}x</span>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default EnhancedNurseSettings;
