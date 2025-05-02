
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, ListPlus, Upload, AlertTriangle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from '@/components/ui/use-toast';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PatientClass, SurgeryCase, ORBlock, defaultOrRooms, generateCustomSurgeryList } from '@/lib/simulation';

interface SurgerySchedulerProps {
  patientClasses: PatientClass[];
  patientDistribution: Record<string, number>;
  simulationDays: number;
  onScheduleGenerated: (surgeryList: SurgeryCase[]) => void;
  onScheduleTypeChange: (type: 'template' | 'custom') => void;
  blocks?: { id: string; orId: string; start: number; end: number; day: number; label: string; allowedProcedures: string[] }[];
  blockScheduleEnabled?: boolean;
}

const SurgeryScheduler: React.FC<SurgerySchedulerProps> = ({
  patientClasses,
  patientDistribution,
  simulationDays,
  onScheduleGenerated,
  onScheduleTypeChange,
  blocks = [],
  blockScheduleEnabled = false
}) => {
  const [scheduleMode, setScheduleMode] = useState<'template' | 'generate' | 'upload'>('template');
  const [orRooms, setOrRooms] = useState<string[]>(defaultOrRooms);
  const [averageDailySurgeries, setAverageDailySurgeries] = useState(25);
  const [csvContent, setCsvContent] = useState<string>('');
  const [surgeryList, setSurgeryList] = useState<SurgeryCase[]>([]);
  const [validationErrors, setValidationErrors] = useState<{invalidCount: number, totalCount: number}>({invalidCount: 0, totalCount: 0});
  
  // Set available OR rooms based on blocks if blocks are enabled
  useEffect(() => {
    if (blockScheduleEnabled && blocks.length > 0) {
      // Extract unique OR room IDs from blocks
      const uniqueORs = Array.from(new Set(blocks.map(block => block.orId)));
      if (uniqueORs.length > 0) {
        setOrRooms(uniqueORs);
      }
    }
  }, [blockScheduleEnabled, blocks]);
  
  // Handle mode change
  const handleModeChange = (mode: 'template' | 'generate' | 'upload') => {
    setScheduleMode(mode);
    onScheduleTypeChange(mode === 'template' ? 'template' : 'custom');
    
    // Clear validation errors when changing mode
    setValidationErrors({invalidCount: 0, totalCount: 0});
  };
  
  // Generate surgery list
  const handleGenerateSchedule = () => {
    const generatedList = generateCustomSurgeryList(
      simulationDays,
      orRooms,
      patientClasses,
      patientDistribution,
      averageDailySurgeries
    );
    
    setSurgeryList(generatedList);
    onScheduleGenerated(generatedList);
    
    toast({
      title: "Leikkauslista generoitu",
      description: `${generatedList.length} leikkausta ${simulationDays} päivälle.`
    });
    
    // If blocks are enabled, validate the generated list against blocks
    if (blockScheduleEnabled && blocks.length > 0) {
      validateAgainstBlocks(generatedList);
    }
  };
  
  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCsvContent(content);
      parseCSV(content);
    };
    
    reader.readAsText(file);
  };
  
  // Parse CSV to surgery list
  const parseCSV = (content: string) => {
    try {
      // Skip header row
      const rows = content.split('\n').slice(1);
      const surgeryList: SurgeryCase[] = [];
      
      rows.forEach((row, index) => {
        if (!row.trim()) return; // Skip empty rows
        
        const columns = row.split(',');
        if (columns.length < 5) {
          throw new Error(`Invalid row format at line ${index + 2}`);
        }
        
        // Expected format: id,classId,orRoom,startTime,duration
        const [id, classId, orRoom, startTimeStr, durationStr] = columns;
        
        // Convert time format (e.g., "1 08:30" = day 1, 8:30 AM)
        const [dayStr, timeStr] = startTimeStr.split(' ');
        const day = parseInt(dayStr, 10) - 1; // 0-based days
        const [hours, minutes] = timeStr.split(':').map(Number);
        const startTime = day * 1440 + hours * 60 + minutes;
        
        surgeryList.push({
          id: id.trim(),
          classId: classId.trim(),
          orRoom: orRoom.trim(),
          scheduledStartTime: startTime,
          duration: parseInt(durationStr, 10)
        });
      });
      
      if (surgeryList.length === 0) {
        throw new Error("No valid surgery entries found in the CSV");
      }
      
      // Sort by start time and send to parent
      const sortedList = surgeryList.sort((a, b) => a.scheduledStartTime - b.scheduledStartTime);
      setSurgeryList(sortedList);
      onScheduleGenerated(sortedList);
      
      toast({
        title: "Leikkauslista ladattu",
        description: `${surgeryList.length} leikkausta tuotu onnistuneesti.`
      });
      
      // If blocks are enabled, validate against blocks
      if (blockScheduleEnabled && blocks.length > 0) {
        validateAgainstBlocks(sortedList);
      }
      
    } catch (error) {
      console.error("CSV parsing error:", error);
      toast({
        title: "Virhe tiedoston käsittelyssä",
        description: error instanceof Error ? error.message : "Tiedosto on virheellinen.",
        variant: "destructive"
      });
    }
  };
  
  // Validate surgeries against blocks
  const validateAgainstBlocks = (surgeries: SurgeryCase[]) => {
    if (!blockScheduleEnabled || blocks.length === 0) {
      setValidationErrors({invalidCount: 0, totalCount: 0});
      return;
    }
    
    let invalidCount = 0;
    
    surgeries.forEach(surgery => {
      // Calculate surgery day and time
      const surgeryDay = Math.floor(surgery.scheduledStartTime / 1440); // 1440 minutes in a day
      const surgeryStartTime = surgery.scheduledStartTime % 1440; // Time within the day
      const surgeryEndTime = surgeryStartTime + surgery.duration;
      
      // Find matching block for this surgery
      const matchingBlock = blocks.find(block => {
        return block.orId === surgery.orRoom && 
               block.day === surgeryDay &&
               surgeryStartTime >= block.start && 
               surgeryEndTime <= block.end &&
               block.allowedProcedures.includes(surgery.classId);
      });
      
      if (!matchingBlock) {
        invalidCount++;
      }
    });
    
    setValidationErrors({
      invalidCount,
      totalCount: surgeries.length
    });
    
    if (invalidCount > 0) {
      toast({
        title: "Yhteensopivuusvaroitus",
        description: `${invalidCount} leikkausta ${surgeries.length} leikkauksesta ei vastaa määritettyjä blokkeja.`,
        variant: "warning"
      });
    }
  };
  
  // Add a new OR room
  const handleAddOrRoom = () => {
    const newRoomNumber = orRooms.length + 1;
    setOrRooms([...orRooms, `OR-${newRoomNumber}`]);
  };
  
  // Remove an OR room
  const handleRemoveOrRoom = (index: number) => {
    if (orRooms.length <= 1) return;
    const updatedRooms = [...orRooms];
    updatedRooms.splice(index, 1);
    setOrRooms(updatedRooms);
  };
  
  // Download a sample CSV template
  const handleDownloadTemplate = () => {
    const header = 'id,classId,orRoom,startTime,duration\n';
    const rows = [
      'case-1,A,OR-1,1 08:30,90',
      'case-2,B,OR-2,1 09:00,120',
      'case-3,D,OR-1,1 10:30,75',
      'case-4,C,OR-3,1 11:00,180',
      'case-5,A,OR-2,1 12:00,60'
    ];
    
    const content = header + rows.join('\n');
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'leikkauslista-pohja.csv';
    a.click();
    
    URL.revokeObjectURL(url);
  };
  
  // Format minutes to HH:MM display
  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };
  
  // Get block info for a specific OR
  const getBlockInfo = (orId: string) => {
    if (!blockScheduleEnabled || blocks.length === 0) return null;
    
    const orBlocks = blocks.filter(block => block.orId === orId);
    if (orBlocks.length === 0) return null;
    
    // Get unique patient classes allowed in this OR
    const allowedClasses = Array.from(
      new Set(orBlocks.flatMap(block => block.allowedProcedures))
    );
    
    // Get operating hours (min start to max end time)
    const minStart = Math.min(...orBlocks.map(block => block.start));
    const maxEnd = Math.max(...orBlocks.map(block => block.end));
    
    return {
      blocks: orBlocks.length,
      allowedClasses,
      operatingHours: `${formatTime(minStart)} - ${formatTime(maxEnd)}`,
      totalHours: orBlocks.reduce((sum, block) => sum + (block.end - block.start) / 60, 0)
    };
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Leikkauslistan hallinta</CardTitle>
        {blockScheduleEnabled && blocks.length > 0 && (
          <div className="text-sm text-muted-foreground">
            Leikkauslista perustuu {blocks.length} määritettyyn saliblokkiin.
          </div>
        )}
      </CardHeader>
      <CardContent>
        <Tabs 
          defaultValue="template" 
          value={scheduleMode}
          onValueChange={(value) => handleModeChange(value as any)}
          className="space-y-4"
        >
          <TabsList className="grid grid-cols-3">
            <TabsTrigger value="template">
              <Clock className="h-4 w-4 mr-2" />
              Automaattinen
            </TabsTrigger>
            <TabsTrigger value="generate">
              <ListPlus className="h-4 w-4 mr-2" />
              Generoi lista
            </TabsTrigger>
            <TabsTrigger value="upload">
              <Upload className="h-4 w-4 mr-2" />
              Lataa CSV
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="template" className="space-y-4">
            <div className="text-sm text-muted-foreground">
              <p>Käytetään automaattista leikkauslistaa, joka perustuu päivittäisiin leikkausmääriin ja tuntijakaumaan.</p>
            </div>
            
            {blockScheduleEnabled && blocks.length > 0 && (
              <Alert>
                <AlertTitle className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  Saliblokit käytössä
                </AlertTitle>
                <AlertDescription>
                  Automaattinen leikkauslista generoidaan salisuunnittelun blokkien perusteella.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>
          
          <TabsContent value="generate" className="space-y-4">
            <div>
              <Label htmlFor="avgDailySurgeries">Leikkauksia/päivä</Label>
              <div className="flex items-center gap-3 mt-1">
                <Input
                  id="avgDailySurgeries"
                  type="number"
                  min={1}
                  max={50}
                  value={averageDailySurgeries}
                  onChange={(e) => setAverageDailySurgeries(parseInt(e.target.value, 10))}
                />
                <span>{averageDailySurgeries}</span>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <Label>Leikkaussalit</Label>
                <Button variant="outline" size="sm" onClick={handleAddOrRoom}>
                  Lisää sali
                </Button>
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                {orRooms.map((room, index) => (
                  <div key={index} className="flex items-center gap-1">
                    <Input 
                      value={room} 
                      onChange={(e) => {
                        const updatedRooms = [...orRooms];
                        updatedRooms[index] = e.target.value;
                        setOrRooms(updatedRooms);
                      }}
                      disabled={blockScheduleEnabled && blocks.length > 0}
                    />
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8" 
                      onClick={() => handleRemoveOrRoom(index)}
                      disabled={blockScheduleEnabled && blocks.length > 0}
                    >
                      ×
                    </Button>
                    
                    {blockScheduleEnabled && blocks.length > 0 && getBlockInfo(room) && (
                      <div className="absolute mt-10 text-xs text-muted-foreground">
                        {getBlockInfo(room)?.operatingHours}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              {blockScheduleEnabled && blocks.length > 0 && (
                <div className="mt-4 text-sm">
                  <Alert variant="warning">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Huomio</AlertTitle>
                    <AlertDescription>
                      Leikkauslista generoidaan saliblokkien perusteella. Salit on määritetty blokkien mukaan.
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </div>
            
            <Button onClick={handleGenerateSchedule} className="w-full">
              <Calendar className="h-4 w-4 mr-2" />
              Generoi leikkauslista
            </Button>
          </TabsContent>
          
          <TabsContent value="upload" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="csvUpload">Lataa leikkauslista (CSV)</Label>
              <Input
                id="csvUpload"
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
              />
              <p className="text-xs text-muted-foreground">
                CSV-tiedoston tulee sisältää sarakkeet: id,classId,orRoom,startTime,duration
              </p>
              <div className="pt-2">
                <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
                  Lataa CSV-pohja
                </Button>
              </div>
            </div>
            
            {blockScheduleEnabled && blocks.length > 0 && (
              <Alert>
                <AlertTitle className="flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Saliblokit käytössä
                </AlertTitle>
                <AlertDescription>
                  Ladatut leikkaukset tarkistetaan saliblokkien yhteensopivuuden suhteen.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>
        </Tabs>
        
        {validationErrors.invalidCount > 0 && (
          <div className="mt-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Yhteensopivuusvirheitä</AlertTitle>
              <AlertDescription>
                {validationErrors.invalidCount} leikkausta {validationErrors.totalCount} leikkauksesta ei vastaa määritettyjä blokkeja. 
                Tarkista leikkausten ajat ja potilasluokat.
              </AlertDescription>
            </Alert>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SurgeryScheduler;
