
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, ListPlus, Upload } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from '@/components/ui/use-toast';
import { PatientClass, SurgeryCase, defaultOrRooms, generateCustomSurgeryList } from '@/lib/simulation';

interface SurgerySchedulerProps {
  patientClasses: PatientClass[];
  patientDistribution: Record<string, number>;
  simulationDays: number;
  onScheduleGenerated: (surgeryList: SurgeryCase[]) => void;
  onScheduleTypeChange: (type: 'template' | 'custom') => void;
}

const SurgeryScheduler: React.FC<SurgerySchedulerProps> = ({
  patientClasses,
  patientDistribution,
  simulationDays,
  onScheduleGenerated,
  onScheduleTypeChange
}) => {
  const [scheduleMode, setScheduleMode] = useState<'template' | 'generate' | 'upload'>('template');
  const [orRooms, setOrRooms] = useState<string[]>(defaultOrRooms);
  const [averageDailySurgeries, setAverageDailySurgeries] = useState(25);
  const [csvContent, setCsvContent] = useState<string>('');
  
  // Handle mode change
  const handleModeChange = (mode: 'template' | 'generate' | 'upload') => {
    setScheduleMode(mode);
    onScheduleTypeChange(mode === 'template' ? 'template' : 'custom');
  };
  
  // Generate surgery list
  const handleGenerateSchedule = () => {
    const surgeryList = generateCustomSurgeryList(
      simulationDays,
      orRooms,
      patientClasses,
      patientDistribution,
      averageDailySurgeries
    );
    
    onScheduleGenerated(surgeryList);
    
    toast({
      title: "Leikkauslista generoitu",
      description: `${surgeryList.length} leikkausta ${simulationDays} päivälle.`
    });
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
      onScheduleGenerated(sortedList);
      
      toast({
        title: "Leikkauslista ladattu",
        description: `${surgeryList.length} leikkausta tuotu onnistuneesti.`
      });
      
    } catch (error) {
      console.error("CSV parsing error:", error);
      toast({
        title: "Virhe tiedoston käsittelyssä",
        description: error instanceof Error ? error.message : "Tiedosto on virheellinen.",
        variant: "destructive"
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Leikkauslistan hallinta</CardTitle>
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
                    />
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8" 
                      onClick={() => handleRemoveOrRoom(index)}
                    >
                      ×
                    </Button>
                  </div>
                ))}
              </div>
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
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default SurgeryScheduler;
