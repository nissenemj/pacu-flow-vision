
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Cell,
  ReferenceLine
} from 'recharts';
import { SurgeryCase, PatientClass } from '@/lib/simulation';

interface GanttChartProps {
  surgeryList: SurgeryCase[];
  patientClasses: PatientClass[];
  showPacu?: boolean;
}

interface GanttBarData {
  id: string;
  resource: string;
  start: number;
  end: number;
  duration: number;
  day: number;
  color: string;
  type: 'surgery' | 'pacu';
  label: string;
  className: string;
  classId: string;
}

const GanttChart: React.FC<GanttChartProps> = ({
  surgeryList,
  patientClasses,
  showPacu = true
}) => {
  if (!surgeryList || surgeryList.length === 0) {
    return (
      <Card className="h-[300px] flex items-center justify-center">
        <CardContent>
          <p className="text-center text-muted-foreground">
            Ei leikkauslistaa näytettäväksi
          </p>
        </CardContent>
      </Card>
    );
  }

  // Format data for Gantt visualization
  const ganttData: GanttBarData[] = [];
  
  // Add surgery operations
  surgeryList.forEach((surgery) => {
    const day = Math.floor(surgery.scheduledStartTime / 1440);
    const patientClass = patientClasses.find(pc => pc.id === surgery.classId);
    const color = patientClass?.color || "#999999";
    const name = patientClass?.name || surgery.classId;
    
    // Add surgery operation
    ganttData.push({
      id: `surgery_${surgery.id}`,
      resource: surgery.orRoom,
      start: surgery.scheduledStartTime,
      end: surgery.scheduledStartTime + surgery.duration,
      duration: surgery.duration,
      day,
      color,
      type: 'surgery',
      label: `Leikkaus (${name})`,
      className: name,
      classId: surgery.classId
    });
    
    // Add PACU recovery if showPacu is true
    if (showPacu) {
      const pacuStart = surgery.scheduledStartTime + surgery.duration;
      const pacuDuration = patientClass?.averagePacuTime || 120; // Default to 2 hours if not specified
      
      ganttData.push({
        id: `pacu_${surgery.id}`,
        resource: 'PACU', // All PACU operations are grouped
        start: pacuStart,
        end: pacuStart + pacuDuration,
        duration: pacuDuration,
        day,
        color: `${color}80`, // Add transparency to PACU bars
        type: 'pacu',
        label: `Heräämö (${name})`,
        className: name,
        classId: surgery.classId
      });
    }
  });
  
  // Group by day
  const days = [...new Set(ganttData.map(d => d.day))].sort((a, b) => a - b);
  
  // Group by resource (OR rooms and PACU)
  const resources = [...new Set(ganttData.map(d => d.resource))].sort((a, b) => {
    if (a === 'PACU') return 1;
    if (b === 'PACU') return -1;
    return a.localeCompare(b);
  });
  
  // For each day, create separate set of data
  const dayData = days.slice(0, 3).map(day => {
    const dayGanttData = ganttData.filter(d => d.day === day);
    
    return {
      day,
      data: dayGanttData
    };
  });
  
  // Custom tooltip for Gantt chart
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      
      const startHour = Math.floor((data.start % 1440) / 60);
      const startMinutes = (data.start % 1440) % 60;
      const endHour = Math.floor((data.end % 1440) / 60);
      const endMinutes = (data.end % 1440) % 60;
      
      return (
        <div className="bg-white p-2 border rounded shadow-lg">
          <p className="font-semibold">{data.id.split('_')[1]}</p>
          <p>Resurssi: {data.resource}</p>
          <p>Päivä {data.day + 1}, {`${startHour.toString().padStart(2, '0')}:${startMinutes.toString().padStart(2, '0')}`} - 
             {`${endHour.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`}</p>
          <p>Kesto: {Math.round(data.duration / 60 * 10) / 10}h</p>
          <p>Tyyppi: {data.label}</p>
        </div>
      );
    }
    return null;
  };

  // Render chart for each day
  return (
    <div className="space-y-6">
      {dayData.map(dayItem => (
        <Card key={`day_${dayItem.day}`} className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Aikataulu - Päivä {dayItem.day + 1}</CardTitle>
          </CardHeader>
          <CardContent className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dayItem.data}
                layout="vertical"
                barCategoryGap={2}
                margin={{ top: 20, right: 30, left: 100, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  type="number" 
                  domain={[
                    (dayItem.day * 1440) + 480, // Start at 8:00 AM of this day
                    (dayItem.day * 1440) + 1200 // End at 8:00 PM of this day
                  ]}
                  tickFormatter={(time) => {
                    const hour = Math.floor((time % 1440) / 60);
                    return `${hour}:00`;
                  }}
                  label={{ value: 'Aika', position: 'insideBottom', offset: -10 }}
                />
                <YAxis 
                  type="category"
                  dataKey="resource"
                  width={100}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar 
                  dataKey="duration" 
                  name="Kesto" 
                  background={{ fill: '#eee' }}
                  minPointSize={3}
                  // Use a function to position each bar at its start time
                  shape={(props: any) => {
                    const { fill, x, y, width, height, payload } = props;
                    
                    // Calculate x position based on start time
                    // We need to normalize the start time to the chart's domain
                    const dayStart = payload.day * 1440;
                    const adjustedStart = payload.start - dayStart;
                    const normalizedStart = (adjustedStart - 480) / (1200 - 480); // Normalize to 0-1 range
                    
                    // Calculate the real width based on duration
                    const hourWidth = width / (1200 - 480); // Width per minute
                    const barWidth = payload.duration * hourWidth;
                    
                    // Calculate the real x position
                    const barX = x + (normalizedStart * width) - (barWidth / 2);
                    
                    return (
                      <rect
                        x={barX}
                        y={y}
                        width={barWidth}
                        height={height}
                        fill={payload.color}
                        fillOpacity={payload.type === 'pacu' ? 0.7 : 0.9}
                        stroke="#fff"
                        strokeWidth={1}
                        rx={4}
                        ry={4}
                      />
                    );
                  }}
                >
                  {dayItem.data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
                
                {/* Reference lines for working hours */}
                <ReferenceLine
                  x={(dayItem.day * 1440) + 540} // 9:00 AM
                  stroke="#666"
                  strokeDasharray="3 3"
                  label={{ value: '9:00', position: 'top' }}
                />
                <ReferenceLine
                  x={(dayItem.day * 1440) + 1020} // 5:00 PM
                  stroke="#666"
                  strokeDasharray="3 3"
                  label={{ value: '17:00', position: 'top' }}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default GanttChart;
