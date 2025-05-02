import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableRow,
} from "@/components/ui/table"
import { toast } from '@/components/ui/use-toast';
import { SurgeryCase, PatientClass, ORBlock } from '@/lib/simulation';
import { Plus, Edit, Trash, Save, X } from 'lucide-react';

interface SurgerySchedulerProps {
  patientClasses: PatientClass[];
  patientDistribution: Record<string, number>;
  simulationDays: number;
  onScheduleGenerated: (surgeryList: SurgeryCase[], type: 'template' | 'custom') => void;
  onScheduleTypeChange: (type: 'template' | 'custom') => void;
  blocks: ORBlock[];
  blockScheduleEnabled: boolean;
}

const SurgeryScheduler: React.FC<SurgerySchedulerProps> = ({
  patientClasses,
  patientDistribution,
  simulationDays,
  onScheduleGenerated,
  onScheduleTypeChange,
  blocks,
  blockScheduleEnabled
}) => {
  const [surgeryList, setSurgeryList] = useState<SurgeryCase[]>([]);
  const [scheduleType, setScheduleType] = useState<'template' | 'custom'>('template');
  const [newSurgery, setNewSurgery] = useState<Omit<SurgeryCase, 'id'>>({
    classId: patientClasses[0]?.id || '',
    scheduledStartTime: 0,
    duration: 60,
    orRoom: 'OR-1',
    priority: 3,
    arrivalTime: 0
  });
  const [editingSurgeryId, setEditingSurgeryId] = useState<string | null>(null);
  const [editedSurgery, setEditedSurgery] = useState<SurgeryCase | null>(null);

  // Update parent component when surgery list changes
  useEffect(() => {
    onScheduleGenerated(surgeryList, scheduleType);
  }, [surgeryList, scheduleType, onScheduleGenerated]);

  // Handle schedule type change
  const handleTypeChange = (type: 'template' | 'custom') => {
    setScheduleType(type);
    onScheduleTypeChange(type);
  };

  // Add a new surgery to the list
  const handleAddSurgery = () => {
    // Validate
    if (!newSurgery.classId || !newSurgery.duration || !newSurgery.orRoom) {
      toast({
        title: "Puuttuvia tietoja",
        description: "Täytä kaikki pakolliset kentät.",
        variant: "destructive"
      });
      return;
    }

    // Check for overlapping surgeries
    const isOverlapping = surgeryList.some(surgery => {
      return (
        surgery.orRoom === newSurgery.orRoom &&
        surgery.scheduledStartTime < newSurgery.scheduledStartTime + newSurgery.duration &&
        surgery.scheduledStartTime + surgery.duration > newSurgery.scheduledStartTime
      );
    });

    if (isOverlapping) {
      // warning-variant korjaaminen
      toast({
        title: "Validointivirhe",
        description: `Leikkaus päällekkäinen: ${newSurgery.classId}`,
        variant: "destructive"  // Muutettu warning -> destructive
      });
      return;
    }
    
    // Validate against blocks
    if (blockScheduleEnabled && blocks.length > 0) {
      const orBlocks = blocks;
      
      // Calculate surgery day and time
      const surgeryDay = Math.floor(newSurgery.scheduledStartTime / 1440); // 1440 minutes in a day
      const surgeryStartTime = newSurgery.scheduledStartTime % 1440; // Time within the day
      const surgeryEndTime = surgeryStartTime + newSurgery.duration;
      
      // Find matching block for this surgery
      const matchingBlock = orBlocks.find(block => {
        return block.orId === newSurgery.orRoom && 
               block.day === surgeryDay &&
               surgeryStartTime >= block.start && 
               surgeryEndTime <= block.end &&
               block.allowedClasses.includes(newSurgery.classId);
      });
      
      if (!matchingBlock) {
        // warning-variant korjaaminen
        toast({
          title: "Blokkisääntövirhe",
          description: `Leikkaus '${newSurgery.classId}' ei sovi yhteenkään määriteltyyn blokkiin.`,
          variant: "destructive"  // Muutettu warning -> destructive
        });
        return;
      }
    }

    const newId = `S-${surgeryList.length + 1}`;
    const surgeryToAdd: SurgeryCase = {
      id: newId,
      ...newSurgery
    };
    setSurgeryList([...surgeryList, surgeryToAdd]);
    setNewSurgery({
      classId: patientClasses[0]?.id || '',
      scheduledStartTime: 0,
      duration: 60,
      orRoom: 'OR-1',
      priority: 3,
      arrivalTime: 0
    });

    toast({
      title: "Leikkaus lisätty",
      description: `${newId} lisätty leikkauslistaan.`
    });
  };

  // Remove a surgery from the list
  const handleRemoveSurgery = (surgeryId: string) => {
    setSurgeryList(surgeryList.filter(surgery => surgery.id !== surgeryId));

    toast({
      title: "Leikkaus poistettu",
      description: `${surgeryId} poistettu leikkauslistasta.`
    });
  };

  // Start editing a surgery
  const handleEditSurgery = (surgery: SurgeryCase) => {
    setEditingSurgeryId(surgery.id);
    setEditedSurgery(surgery);
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingSurgeryId(null);
    setEditedSurgery(null);
  };

  // Save edited surgery
  const handleSaveEdit = () => {
    if (!editedSurgery) return;

    // Validate
    if (!editedSurgery.classId || !editedSurgery.duration || !editedSurgery.orRoom) {
      toast({
        title: "Puuttuvia tietoja",
        description: "Täytä kaikki pakolliset kentät.",
        variant: "destructive"
      });
      return;
    }

    // Check for overlapping surgeries
    const isOverlapping = surgeryList.some(surgery => {
      return (
        surgery.id !== editedSurgery.id &&
        surgery.orRoom === editedSurgery.orRoom &&
        surgery.scheduledStartTime < editedSurgery.scheduledStartTime + editedSurgery.duration &&
        surgery.scheduledStartTime + surgery.duration > editedSurgery.scheduledStartTime
      );
    });

    if (isOverlapping) {
      toast({
        title: "Validointivirhe",
        description: `Leikkaus päällekkäinen: ${editedSurgery.id}`,
        variant: "destructive"
      });
      return;
    }
    
    // Validate against blocks
    if (blockScheduleEnabled && blocks.length > 0) {
      const orBlocks = blocks;
      
      // Calculate surgery day and time
      const surgeryDay = Math.floor(editedSurgery.scheduledStartTime / 1440); // 1440 minutes in a day
      const surgeryStartTime = editedSurgery.scheduledStartTime % 1440; // Time within the day
      const surgeryEndTime = surgeryStartTime + editedSurgery.duration;
      
      // Find matching block for this surgery
      const matchingBlock = orBlocks.find(block => {
        return block.orId === editedSurgery.orRoom && 
               block.day === surgeryDay &&
               surgeryStartTime >= block.start && 
               surgeryEndTime <= block.end &&
               block.allowedClasses.includes(editedSurgery.classId);
      });
      
      if (!matchingBlock) {
        toast({
          title: "Blokkisääntövirhe",
          description: `Leikkaus '${editedSurgery.id}' ei sovi yhteenkään määriteltyyn blokkiin.`,
          variant: "destructive"
        });
        return;
      }
    }

    setSurgeryList(surgeryList.map(surgery =>
      surgery.id === editingSurgeryId ? editedSurgery : surgery
    ));
    setEditingSurgeryId(null);
    setEditedSurgery(null);

    toast({
      title: "Leikkaus päivitetty",
      description: `${editedSurgery.id} päivitetty leikkauslistassa.`
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Leikkausaikataulu</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <Label>Aikataulun tyyppi</Label>
          <Select value={scheduleType} onValueChange={handleTypeChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Valitse aikataulun tyyppi" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="template">Oletus</SelectItem>
              <SelectItem value="custom">Mukautettu</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {scheduleType === 'custom' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-4">
              <div>
                <Label htmlFor="classId">Potilasluokka</Label>
                <Select
                  value={newSurgery.classId}
                  onValueChange={(value) => setNewSurgery({ ...newSurgery, classId: value })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Valitse luokka" />
                  </SelectTrigger>
                  <SelectContent>
                    {patientClasses.map(pc => (
                      <SelectItem key={pc.id} value={pc.id}>{pc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="orRoom">Leikkaussali</Label>
                <Input
                  id="orRoom"
                  type="text"
                  value={newSurgery.orRoom}
                  onChange={(e) => setNewSurgery({ ...newSurgery, orRoom: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="scheduledStartTime">Aloitusaika</Label>
                <Input
                  id="scheduledStartTime"
                  type="number"
                  value={newSurgery.scheduledStartTime}
                  onChange={(e) => setNewSurgery({ ...newSurgery, scheduledStartTime: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <Label htmlFor="duration">Kesto (min)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={newSurgery.duration}
                  onChange={(e) => setNewSurgery({ ...newSurgery, duration: parseInt(e.target.value) })}
                />
              </div>
              <div className="md:col-span-2 flex items-end">
                <Button onClick={handleAddSurgery}>
                  <Plus className="h-4 w-4 mr-2" />
                  Lisää leikkaus
                </Button>
              </div>
            </div>

            <Table>
              <TableCaption>Leikkausaikataulu</TableCaption>
              <TableHead>
                <TableRow>
                  <TableHead>Luokka</TableHead>
                  <TableHead>Sali</TableHead>
                  <TableHead>Aloitusaika</TableHead>
                  <TableHead>Kesto</TableHead>
                  <TableHead className="text-right">Toiminnot</TableHead>
                </TableRow>
              </TableHead>
              <TableBody>
                {surgeryList.map(surgery => (
                  <TableRow key={surgery.id}>
                    <TableCell>{patientClasses.find(pc => pc.id === surgery.classId)?.name}</TableCell>
                    <TableCell>{surgery.orRoom}</TableCell>
                    <TableCell>{surgery.scheduledStartTime}</TableCell>
                    <TableCell>{surgery.duration}</TableCell>
                    <TableCell className="text-right">
                      {editingSurgeryId === surgery.id ? (
                        <div className="flex justify-end space-x-2">
                          <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                            <X className="h-4 w-4 mr-1" />
                            Peruuta
                          </Button>
                          <Button size="sm" onClick={handleSaveEdit}>
                            <Save className="h-4 w-4 mr-1" />
                            Tallenna
                          </Button>
                        </div>
                      ) : (
                        <div className="flex justify-end space-x-2">
                          <Button size="sm" variant="ghost" onClick={() => handleEditSurgery(surgery)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleRemoveSurgery(surgery.id)}>
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default SurgeryScheduler;
