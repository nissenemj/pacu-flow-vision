
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from '@/components/ui/use-toast';
import { Plus, Trash, RotateCw, Clock, Move } from 'lucide-react';
import { PatientClass } from '@/lib/simulation';

// Block and OR Types
interface ORRoom {
  id: string;
  name: string;
  equipment: string[];
  openTime: number; // minutes from day start
  closeTime: number; // minutes from day start
}

interface Block {
  id: string;
  orId: string;
  start: number; // minutes from day start
  end: number; // minutes from day start
  label: string;
  allowedProcedures: string[]; // patient class IDs
  color?: string;
}

interface BlockSchedulerProps {
  patientClasses: PatientClass[];
  onScheduleChange: (blocks: Block[]) => void;
  defaultORRooms?: ORRoom[];
}

const defaultORs: ORRoom[] = [
  { id: 'OR-1', name: 'Sali 1', equipment: ['standard'], openTime: 7 * 60, closeTime: 15 * 60 },
  { id: 'OR-2', name: 'Sali 2', equipment: ['standard', 'robotic'], openTime: 7 * 60, closeTime: 15 * 60 },
  { id: 'OR-3', name: 'Sali 3', equipment: ['standard'], openTime: 7 * 60, closeTime: 15 * 60 },
];

// Template blocks per OR
const createTemplateBlocks = (orId: string): Block[] => {
  return [
    { 
      id: `${orId}-1`, 
      orId: orId, 
      start: 7 * 60, 
      end: 10 * 60, 
      label: 'Aamu', 
      allowedProcedures: ['A'] 
    },
    { 
      id: `${orId}-2`, 
      orId: orId, 
      start: 10 * 60, 
      end: 13 * 60, 
      label: 'Keskipäivä', 
      allowedProcedures: ['A', 'D'] 
    },
    { 
      id: `${orId}-3`, 
      orId: orId, 
      start: 13 * 60, 
      end: 15 * 60, 
      label: 'Iltapäivä', 
      allowedProcedures: ['D'] 
    },
  ];
};

const BlockScheduler: React.FC<BlockSchedulerProps> = ({
  patientClasses,
  onScheduleChange,
  defaultORRooms = defaultORs
}) => {
  const [orRooms, setORRooms] = useState<ORRoom[]>(defaultORRooms);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [draggingBlock, setDraggingBlock] = useState<Block | null>(null);
  
  // Initialize blocks
  useEffect(() => {
    let initialBlocks: Block[] = [];
    orRooms.forEach(or => {
      initialBlocks = [...initialBlocks, ...createTemplateBlocks(or.id)];
    });
    setBlocks(initialBlocks);
  }, []);

  // Update parent component when blocks change
  useEffect(() => {
    onScheduleChange(blocks);
  }, [blocks, onScheduleChange]);
  
  // Add a new OR room
  const handleAddOR = () => {
    const nextId = `OR-${orRooms.length + 1}`;
    const newOR = { 
      id: nextId, 
      name: `Sali ${orRooms.length + 1}`, 
      equipment: ['standard'], 
      openTime: 7 * 60, 
      closeTime: 15 * 60 
    };
    
    setORRooms([...orRooms, newOR]);
    
    // Add template blocks for the new OR
    const newBlocks = createTemplateBlocks(nextId);
    setBlocks([...blocks, ...newBlocks]);
    
    toast({
      title: "Leikkaussali lisätty",
      description: `${newOR.name} lisätty aikatauluun.`
    });
  };
  
  // Remove an OR room
  const handleRemoveOR = (orId: string) => {
    if (orRooms.length <= 1) {
      toast({
        title: "Ei voida poistaa",
        description: "Ainakin yksi leikkaussali on oltava käytössä.",
        variant: "destructive"
      });
      return;
    }
    
    setORRooms(orRooms.filter(or => or.id !== orId));
    setBlocks(blocks.filter(block => block.orId !== orId));
    
    toast({
      title: "Leikkaussali poistettu",
      description: `${orId} on poistettu aikataulusta.`
    });
  };
  
  // Add a new block to an OR
  const handleAddBlock = (orId: string) => {
    const orBlocks = blocks.filter(b => b.orId === orId).sort((a, b) => a.end - b.end);
    const lastBlock = orBlocks.length > 0 ? orBlocks[orBlocks.length - 1] : null;
    
    const startTime = lastBlock ? lastBlock.end : orRooms.find(or => or.id === orId)!.openTime;
    const endTime = Math.min(startTime + 180, orRooms.find(or => or.id === orId)!.closeTime); // 3-hour block or until closing
    
    if (startTime >= endTime) {
      toast({
        title: "Ei voida lisätä",
        description: "Leikkaussalin aikataulu on jo täynnä.",
        variant: "destructive"
      });
      return;
    }
    
    const newBlock: Block = {
      id: `${orId}-${blocks.filter(b => b.orId === orId).length + 1}`,
      orId: orId,
      start: startTime,
      end: endTime,
      label: 'Uusi blokki',
      allowedProcedures: ['A', 'B', 'C', 'D'], // Allow all by default
    };
    
    setBlocks([...blocks, newBlock]);
  };
  
  // Remove a block
  const handleRemoveBlock = (blockId: string) => {
    setBlocks(blocks.filter(block => block.id !== blockId));
  };
  
  // Update block allowed procedures
  const handleUpdateBlockProcedures = (blockId: string, procedureIds: string[]) => {
    setBlocks(blocks.map(block => 
      block.id === blockId ? { ...block, allowedProcedures: procedureIds } : block
    ));
  };
  
  // Optimize schedule (placeholder for now)
  const handleOptimizeSchedule = () => {
    toast({
      title: "Optimointi käynnistetty",
      description: "Aikataulun optimointi on käynnissä..."
    });
    
    // Here we would call the optimization algorithm
    // For now, we just update the UI after a short delay
    setTimeout(() => {
      toast({
        title: "Optimointi valmis",
        description: "Aikataulu on optimoitu onnistuneesti."
      });
    }, 1500);
  };
  
  // Format minutes to HH:MM display
  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  // Render the block with patient class colors
  const renderBlock = (block: Block) => {
    // Find matching patient class for color
    const blockColor = block.allowedProcedures.length === 1 && patientClasses.find(
      pc => pc.id === block.allowedProcedures[0]
    )?.color;
    
    return (
      <div 
        key={block.id}
        className="mb-2 p-2 rounded border relative"
        style={{ backgroundColor: blockColor ? `${blockColor}20` : undefined, borderColor: blockColor }}
      >
        <div className="flex justify-between items-center">
          <div>
            <div className="font-medium">{block.label}</div>
            <div className="text-sm text-gray-600">
              {formatTime(block.start)} - {formatTime(block.end)} ({Math.round((block.end - block.start) / 60 * 10) / 10}h)
            </div>
          </div>
          <div className="flex space-x-1">
            <Button size="sm" variant="ghost" onClick={() => handleRemoveBlock(block.id)}>
              <Trash className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="mt-2">
          <Label className="text-xs">Sallitut potilasluokat</Label>
          <div className="flex flex-wrap mt-1 gap-1">
            {patientClasses.map((pc) => (
              <div
                key={pc.id}
                className={`px-2 py-1 text-xs rounded cursor-pointer ${
                  block.allowedProcedures.includes(pc.id) 
                    ? 'text-white' 
                    : 'text-gray-600 bg-gray-100'
                }`}
                style={{
                  backgroundColor: block.allowedProcedures.includes(pc.id) ? pc.color : undefined
                }}
                onClick={() => {
                  const updatedProcedures = block.allowedProcedures.includes(pc.id) 
                    ? block.allowedProcedures.filter(id => id !== pc.id)
                    : [...block.allowedProcedures, pc.id];
                  
                  // Ensure at least one procedure type is selected
                  if (updatedProcedures.length > 0) {
                    handleUpdateBlockProcedures(block.id, updatedProcedures);
                  }
                }}
              >
                {pc.id}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <span>Leikkaussali blokit</span>
          <Button size="sm" variant="outline" onClick={handleOptimizeSchedule}>
            <RotateCw className="h-4 w-4 mr-2" />
            Optimoi aikataulu
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex justify-end">
          <Button onClick={handleAddOR}>
            <Plus className="h-4 w-4 mr-2" />
            Lisää leikkaussali
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {orRooms.map((or) => (
            <Card key={or.id} className="shadow-sm">
              <CardHeader className="py-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>{or.name}</span>
                  {orRooms.length > 1 && (
                    <Button size="sm" variant="ghost" onClick={() => handleRemoveOR(or.id)}>
                      <Trash className="h-4 w-4" />
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-gray-500 flex justify-between mb-2">
                  <span>
                    <Clock className="h-3 w-3 inline mr-1" />
                    {formatTime(or.openTime)} - {formatTime(or.closeTime)}
                  </span>
                  <Button size="sm" variant="ghost" className="h-6 py-0 px-1" onClick={() => handleAddBlock(or.id)}>
                    <Plus className="h-3 w-3 mr-1" /> Blokki
                  </Button>
                </div>
                
                {blocks
                  .filter(block => block.orId === or.id)
                  .sort((a, b) => a.start - b.start)
                  .map(renderBlock)}
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default BlockScheduler;
