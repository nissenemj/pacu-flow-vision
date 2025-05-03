
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PatientClass, SurgeryCase } from '@/lib/simulation';

interface GanttChartProps {
  surgeries: SurgeryCase[];
  patientClasses: PatientClass[];
}

// Helper function to format time as HH:MM
const formatTime = (minutes: number): string => {
  const days = Math.floor(minutes / 1440); // 1440 minutes in a day
  const dayMinutes = minutes % 1440;
  const hours = Math.floor(dayMinutes / 60);
  const mins = Math.floor(dayMinutes % 60);
  return `D${days+1} ${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

const GanttChart: React.FC<GanttChartProps> = ({ surgeries, patientClasses }) => {
  if (!surgeries || surgeries.length === 0) {
    return <p>Ei leikkauksia näytettäväksi.</p>;
  }

  // Process surgeries to create Gantt chart data
  const processedSurgeries = surgeries
    .filter(s => s.orStartTime !== undefined && s.pacuPhase1StartTime !== undefined)
    .sort((a, b) => (a.orStartTime || 0) - (b.orStartTime || 0));

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Potilasvirta: Leikkaus → PACU → Osasto</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            <div className="flex font-bold text-sm mb-2">
              <div className="w-[15%]">ID</div>
              <div className="w-[15%]">Potilasluokka</div>
              <div className="w-[70%]">Aikajana</div>
            </div>

            <div className="space-y-2">
              {processedSurgeries.map((surgery) => {
                const patientClass = patientClasses.find(pc => pc.id === surgery.classId);
                
                // Calculate time points
                const orStart = surgery.orStartTime || 0;
                const orEnd = surgery.orEndTime || orStart;
                const pacu1Start = surgery.pacuPhase1StartTime || orEnd;
                const pacu1End = surgery.pacuPhase1EndTime || pacu1Start;
                const pacu2Start = surgery.pacuPhase2StartTime || pacu1End;
                const pacu2End = surgery.pacuPhase2EndTime || pacu2Start;
                const wardStart = surgery.wardArrivalTime || pacu2End;
                
                // Calculate positions and widths as percentages
                const timelineStart = Math.max(0, orStart - 30); // Add some padding
                const timelineEnd = Math.max(wardStart + 60, orEnd + 240); // Add padding at the end too
                const totalDuration = timelineEnd - timelineStart;
                
                const orStartPos = ((orStart - timelineStart) / totalDuration) * 100;
                const orWidth = ((orEnd - orStart) / totalDuration) * 100;
                const pacu1Width = ((pacu1End - pacu1Start) / totalDuration) * 100;
                const pacu1StartPos = ((pacu1Start - timelineStart) / totalDuration) * 100;
                const pacu2Width = ((pacu2End - pacu2Start) / totalDuration) * 100;
                const pacu2StartPos = ((pacu2Start - timelineStart) / totalDuration) * 100;
                const wardWidth = ((wardStart + 30 - wardStart) / totalDuration) * 100; // Just show a marker
                const wardStartPos = ((wardStart - timelineStart) / totalDuration) * 100;
                
                return (
                  <div key={surgery.id} className="flex items-center text-sm">
                    <div className="w-[15%] truncate" title={surgery.id}>{surgery.id}</div>
                    <div className="w-[15%] flex items-center">
                      <div 
                        className="w-3 h-3 rounded-full mr-2" 
                        style={{ backgroundColor: patientClass?.color || '#888' }}
                      ></div>
                      <span className="truncate" title={patientClass?.name}>{patientClass?.name}</span>
                    </div>
                    <div className="w-[70%] h-10 relative bg-gray-100 rounded">
                      {/* Time labels */}
                      <div className="absolute -bottom-5 left-0 text-xs">{formatTime(timelineStart)}</div>
                      <div className="absolute -bottom-5 right-0 text-xs">{formatTime(timelineEnd)}</div>
                      
                      {/* OR segment */}
                      {orStart !== undefined && orEnd !== undefined && (
                        <div 
                          className="absolute top-0 h-full rounded bg-blue-500 border-blue-600 border opacity-80 flex items-center justify-center"
                          style={{ left: `${orStartPos}%`, width: `${orWidth}%` }}
                          title={`Leikkaus: ${formatTime(orStart)} - ${formatTime(orEnd)}`}
                        >
                          <span className="text-white text-xs truncate px-1">OR</span>
                        </div>
                      )}
                      
                      {/* PACU1 segment */}
                      {pacu1Start !== undefined && pacu1End !== undefined && pacu1Start !== pacu1End && (
                        <div 
                          className="absolute top-0 h-full rounded bg-green-500 border-green-600 border opacity-80 flex items-center justify-center"
                          style={{ left: `${pacu1StartPos}%`, width: `${pacu1Width}%` }}
                          title={`PACU1: ${formatTime(pacu1Start)} - ${formatTime(pacu1End)}`}
                        >
                          <span className="text-white text-xs truncate px-1">P1</span>
                        </div>
                      )}
                      
                      {/* PACU2 segment */}
                      {pacu2Start !== undefined && pacu2End !== undefined && pacu2Start !== pacu2End && (
                        <div 
                          className="absolute top-0 h-full rounded bg-yellow-500 border-yellow-600 border opacity-80 flex items-center justify-center"
                          style={{ left: `${pacu2StartPos}%`, width: `${pacu2Width}%` }}
                          title={`PACU2: ${formatTime(pacu2Start)} - ${formatTime(pacu2End)}`}
                        >
                          <span className="text-white text-xs truncate px-1">P2</span>
                        </div>
                      )}
                      
                      {/* Ward marker */}
                      {wardStart !== undefined && (
                        <div 
                          className="absolute top-0 h-full rounded bg-red-500 border-red-600 border opacity-80 flex items-center justify-center"
                          style={{ left: `${wardStartPos}%`, width: `${wardWidth}%` }}
                          title={`Ward: ${formatTime(wardStart)}`}
                        >
                          <span className="text-white text-xs truncate px-1">O</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Legend */}
            <div className="flex items-center justify-end space-x-4 mt-6 text-sm">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-500 rounded mr-1"></div>
                <span>OR</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded mr-1"></div>
                <span>PACU P1</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-yellow-500 rounded mr-1"></div>
                <span>PACU P2</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-500 rounded mr-1"></div>
                <span>Osasto</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default GanttChart;
