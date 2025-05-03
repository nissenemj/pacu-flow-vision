
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PatientClass, SurgeryCase } from '@/lib/simulation';
import { Badge } from "@/components/ui/badge";

interface ORScheduleChartProps {
  surgeries: SurgeryCase[];
  orCount?: number;
  patientClasses?: PatientClass[];
}

// Helper function to format time as HH:MM
const formatTime = (minutes: number): string => {
  const days = Math.floor(minutes / 1440); // 1440 minutes in a day
  const dayMinutes = minutes % 1440;
  const hours = Math.floor(dayMinutes / 60);
  const mins = Math.floor(dayMinutes % 60);
  return `D${days+1} ${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

const ORScheduleChart: React.FC<ORScheduleChartProps> = ({ surgeries, orCount = 5, patientClasses = [] }) => {
  if (!surgeries || surgeries.length === 0) {
    return <p>Ei leikkauksia näytettäväksi.</p>;
  }

  // Group surgeries by OR room and sort by start time
  const orGroupedSurgeries = useMemo(() => {
    // First, identify all unique OR rooms in the data
    const allORs = [...new Set(surgeries.map(s => s.orRoom))].sort();
    
    // Group surgeries by OR room
    const grouped: Record<string, SurgeryCase[]> = {};
    allORs.forEach(orRoom => {
      const orSurgeries = surgeries
        .filter(s => s.orRoom === orRoom && s.orStartTime !== undefined)
        .sort((a, b) => (a.orStartTime || 0) - (b.orStartTime || 0));
      
      if (orSurgeries.length > 0) {
        grouped[orRoom] = orSurgeries;
      }
    });
    
    return grouped;
  }, [surgeries]);

  // Calculate the overall time range for visualization
  const timeRange = useMemo(() => {
    let minTime = Infinity;
    let maxTime = 0;
    
    surgeries.forEach(surgery => {
      if (surgery.orStartTime !== undefined) {
        minTime = Math.min(minTime, surgery.orStartTime);
      }
      if (surgery.orEndTime !== undefined) {
        maxTime = Math.max(maxTime, surgery.orEndTime);
      }
    });
    
    // Add some padding
    minTime = Math.max(0, minTime - 60);
    maxTime = maxTime + 60;
    
    return { minTime, maxTime, totalDuration: maxTime - minTime };
  }, [surgeries]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Leikkaussalien aikataulu</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            {Object.entries(orGroupedSurgeries).map(([orRoom, orSurgeries]) => (
              <div key={orRoom} className="mb-8">
                <h3 className="font-bold text-lg mb-2">{orRoom}</h3>
                <div className="space-y-2">
                  {/* Time scale */}
                  <div className="relative h-6 border-b border-gray-300">
                    {Array.from({ length: 7 }).map((_, i) => {
                      const position = (i * (timeRange.totalDuration / 6)) / timeRange.totalDuration * 100;
                      const timeValue = timeRange.minTime + (i * (timeRange.totalDuration / 6));
                      return (
                        <div 
                          key={i} 
                          className="absolute bottom-0 transform -translate-x-1/2"
                          style={{ left: `${position}%` }}
                        >
                          <div className="h-2 w-0.5 bg-gray-300"></div>
                          <div className="text-xs text-gray-600">{formatTime(timeValue)}</div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Surgeries for this OR */}
                  <div className="relative h-16 bg-gray-50 rounded">
                    {orSurgeries.map(surgery => {
                      const orStart = surgery.orStartTime || 0;
                      const orEnd = surgery.orEndTime || orStart;
                      const startPos = ((orStart - timeRange.minTime) / timeRange.totalDuration) * 100;
                      const width = ((orEnd - orStart) / timeRange.totalDuration) * 100;
                      
                      const patientClass = patientClasses.find(pc => pc.id === surgery.classId);
                      const backgroundColor = patientClass?.color || '#888';
                      
                      return (
                        <div 
                          key={surgery.id}
                          className="absolute top-0 h-full rounded shadow-sm border flex items-center justify-center"
                          style={{ 
                            left: `${startPos}%`, 
                            width: `${width}%`,
                            backgroundColor,
                            borderColor: backgroundColor
                          }}
                          title={`${surgery.id}: ${formatTime(orStart)} - ${formatTime(orEnd)}`}
                        >
                          <span className="text-white text-xs truncate px-1">
                            {patientClass?.name || surgery.classId}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
            
            {/* Legend for patient classes */}
            {patientClasses.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {patientClasses.map(pc => (
                  <Badge key={pc.id} style={{ backgroundColor: pc.color }} variant="outline">
                    {pc.name}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ORScheduleChart;
