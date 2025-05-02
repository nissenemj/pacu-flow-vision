
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';
import { SurgeryCase, PatientClass } from '@/lib/simulation';

interface ORScheduleChartProps {
  surgeryList: SurgeryCase[];
  patientClasses: PatientClass[];
}

interface FormattedSurgeryCase {
  id: string;
  orRoom: string;
  startTime: number;
  endTime: number;
  day: number;
  hour: number;
  duration: number;
  patientClass: string;
  color: string;
}

const ORScheduleChart: React.FC<ORScheduleChartProps> = ({
  surgeryList,
  patientClasses
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

  // Format data for visualization
  const formattedData: FormattedSurgeryCase[] = surgeryList.map((surgery) => {
    const day = Math.floor(surgery.scheduledStartTime / 1440);
    const dayMinutes = surgery.scheduledStartTime % 1440;
    const hour = dayMinutes / 60;
    const endTime = surgery.scheduledStartTime + surgery.duration;
    
    const patientClass = patientClasses.find(pc => pc.id === surgery.classId);
    
    return {
      id: surgery.id,
      orRoom: surgery.orRoom,
      startTime: surgery.scheduledStartTime,
      endTime,
      day,
      hour,
      duration: surgery.duration,
      patientClass: patientClass?.name || surgery.classId,
      color: patientClass?.color || "#999999"
    };
  });
  
  // Group by day to show first 3 days
  const days = [...new Set(formattedData.map(d => d.day))].sort((a, b) => a - b);
  const orRooms = [...new Set(formattedData.map(d => d.orRoom))].sort();
  
  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      
      const startHour = Math.floor((data.startTime % 1440) / 60);
      const startMinutes = (data.startTime % 1440) % 60;
      const endHour = Math.floor((data.endTime % 1440) / 60);
      const endMinutes = (data.endTime % 1440) % 60;
      
      return (
        <div className="bg-white p-2 border rounded shadow-lg">
          <p className="font-semibold">{data.id}</p>
          <p>Sali: {data.orRoom}</p>
          <p>Päivä {data.day + 1}, {`${startHour.toString().padStart(2, '0')}:${startMinutes.toString().padStart(2, '0')}`} - 
             {`${endHour.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`}</p>
          <p>Kesto: {Math.round(data.duration / 60 * 10) / 10}h</p>
          <p>Potilasluokka: {data.patientClass}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Leikkausaikataulu</CardTitle>
      </CardHeader>
      <CardContent className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart
            margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
          >
            <CartesianGrid />
            <XAxis 
              type="number" 
              dataKey="hour" 
              name="Aika" 
              domain={[6, 20]} 
              tickCount={15}
              tickFormatter={(hour) => `${Math.floor(hour)}:00`}
              label={{ value: 'Aika', position: 'insideBottom', offset: -5 }}
            />
            <YAxis 
              type="category" 
              dataKey="orRoom" 
              name="Sali"
              // Removed the unsupported 'allowDuplication' property
              label={{ value: 'Leikkaussali', angle: -90, position: 'insideLeft' }} 
            />
            <ZAxis 
              type="number" 
              dataKey="duration" 
              range={[50, 300]} 
              name="Kesto" 
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {
              days.slice(0, 3).map((day, idx) => (
                <Scatter 
                  key={day}
                  name={`Päivä ${day + 1}`} 
                  data={formattedData.filter(d => d.day === day)}
                  fill="#8884d8"
                  shape={(props: any) => {
                    const { cx, cy, width, height, payload } = props;
                    // Calculate width based on duration
                    const durationWidth = (payload.duration / 60) * 40; // scale factor
                    
                    return (
                      <rect
                        x={cx - 4}
                        y={cy - 10}
                        width={durationWidth > 10 ? durationWidth : 10}
                        height={20}
                        fill={payload.color}
                        opacity={0.7}
                        rx={4}
                        ry={4}
                      />
                    );
                  }}
                />
              ))
            }
          </ScatterChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default ORScheduleChart;
