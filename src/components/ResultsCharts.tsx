
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { SimulationResults, PatientClass } from '@/lib/simulation';

interface ResultsChartsProps {
  results: SimulationResults | null;
  patientClasses: PatientClass[];
}

const ResultsCharts: React.FC<ResultsChartsProps> = ({ results, patientClasses }) => {
  if (!results) {
    return (
      <Card className="h-[350px] flex items-center justify-center">
        <CardContent>
          <p className="text-center text-muted-foreground">
            Aja simulaatio nähdäksesi tulokset
          </p>
        </CardContent>
      </Card>
    );
  }

  // Transform data for time-based charts
  const timeSeriesData = [];
  const numPoints = Math.min(results.bedOccupancy.length, results.nurseUtilization.length);
  
  for (let i = 0; i < numPoints; i++) {
    const dataPoint: any = {
      time: `${Math.floor(i / 4)}:${(i % 4) * 15 === 0 ? '00' : (i % 4) * 15}`,
      bedOccupancy: Number((results.bedOccupancy[i] * 100).toFixed(1)),
      nurseUtilization: Number((results.nurseUtilization[i] * 100).toFixed(1))
    };
    
    // Add OR utilization if available
    if (results.orUtilization) {
      Object.keys(results.orUtilization).forEach(orRoom => {
        if (i < results.orUtilization![orRoom].length) {
          dataPoint[`or_${orRoom}`] = results.orUtilization![orRoom][i] * 100;
        }
      });
    }
    
    timeSeriesData.push(dataPoint);
  }

  // Create patient distribution data
  const patientDistributionData = patientClasses.map(pc => ({
    name: pc.name,
    count: results.patientTypeCount[pc.id] || 0,
    fill: pc.color
  }));
  
  // Create wait time distribution data
  const waitTimeBuckets: Record<string, number> = {
    '0-15 min': 0,
    '15-30 min': 0,
    '30-60 min': 0,
    '1-2 h': 0,
    '2+ h': 0
  };
  
  results.waitTimes.forEach(waitTime => {
    if (waitTime < 15) waitTimeBuckets['0-15 min']++;
    else if (waitTime < 30) waitTimeBuckets['15-30 min']++;
    else if (waitTime < 60) waitTimeBuckets['30-60 min']++;
    else if (waitTime < 120) waitTimeBuckets['1-2 h']++;
    else waitTimeBuckets['2+ h']++;
  });
  
  const waitTimeData = Object.entries(waitTimeBuckets).map(([range, count]) => ({
    range,
    count,
    percentage: Number((count / results.waitTimes.length * 100).toFixed(1))
  }));
  
  // Format peak occupancy data if available
  const peakOccupancyData = results.peakTimes 
    ? results.peakTimes.map(peak => {
        const day = Math.floor(peak.time / 1440);
        const dayMinutes = peak.time % 1440;
        const hour = Math.floor(dayMinutes / 60);
        const minute = dayMinutes % 60;
        return {
          time: peak.time,
          formattedTime: `D${day+1} ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
          occupancy: Math.round(peak.occupancy * 100)
        };
      })
    : [];

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Resurssien käyttö</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={timeSeriesData.slice(0, 24 * 4)} // Show first 24 hours
              margin={{ top: 5, right: 30, left: 5, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="time" 
                tick={{ fontSize: 12 }} 
                interval={4}
                label={{ value: 'Aika (tunnit)', position: 'insideBottom', offset: -5 }}
              />
              <YAxis 
                domain={[0, 100]} 
                label={{ 
                  value: 'Käyttöaste (%)', 
                  angle: -90, 
                  position: 'insideLeft'
                }}
              />
              <Tooltip 
                formatter={(value) => [`${value}%`]} 
                labelFormatter={(label) => `Aika: ${label}`}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="bedOccupancy" 
                name="Vuodekäyttö" 
                stroke="#0ea5e9" 
                strokeWidth={2}
                activeDot={{ r: 6 }} 
              />
              <Line 
                type="monotone" 
                dataKey="nurseUtilization" 
                name="Hoitajakäyttö" 
                stroke="#22c55e" 
                strokeWidth={2}
                activeDot={{ r: 6 }} 
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Potilasjakauma</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={patientDistributionData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis label={{ value: 'Potilaiden määrä', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Bar dataKey="count" name="Potilaiden määrä">
                {patientDistributionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Odotusaikajakauma</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={waitTimeData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="range" />
              <YAxis 
                yAxisId="left" 
                orientation="left" 
                label={{ value: 'Potilaiden määrä', angle: -90, position: 'insideLeft' }} 
              />
              <YAxis 
                yAxisId="right" 
                orientation="right" 
                domain={[0, 100]} 
                label={{ value: '%', angle: 90, position: 'insideRight' }} 
              />
              <Tooltip formatter={(value, name) => {
                return name === 'percentage' ? `${value}%` : value;
              }} />
              <Legend />
              <Bar yAxisId="left" dataKey="count" name="Potilaat" fill="#0ea5e9" />
              <Bar yAxisId="right" dataKey="percentage" name="%" fill="#22c55e" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Yhteenveto</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Keskimääräinen odotusaika</p>
                <p className="text-2xl font-semibold text-medical-blue">
                  {Math.round(results.meanWaitTime)} min
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">P95 odotusaika</p>
                <p className="text-2xl font-semibold text-medical-blue">
                  {Math.round(results.p95WaitTime)} min
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Keskimääräinen vuodekäyttö</p>
                <p className="text-2xl font-semibold text-medical-teal">
                  {Math.round(results.meanBedOccupancy * 100)}%
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Maksimi vuodekäyttö</p>
                <p className="text-2xl font-semibold text-medical-teal">
                  {Math.round(results.maxBedOccupancy * 100)}%
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Keskimääräinen hoitajakäyttö</p>
                <p className="text-2xl font-semibold text-medical-green">
                  {Math.round(results.meanNurseUtilization * 100)}%
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Maksimi hoitajakäyttö</p>
                <p className="text-2xl font-semibold text-medical-green">
                  {Math.round(results.maxNurseUtilization * 100)}%
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {results.peakTimes && results.peakTimes.length > 0 && (
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Ruuhkahuiput (>80% vuodekäyttö)</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={peakOccupancyData}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="formattedTime" 
                  label={{ value: 'Aika', position: 'insideBottom', offset: -5 }}
                />
                <YAxis 
                  domain={[75, 100]}
                  label={{ value: 'Vuodekäyttö (%)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  formatter={(value) => [`${value}%`, 'Vuodekäyttö']}
                />
                <Area 
                  type="monotone" 
                  dataKey="occupancy" 
                  stroke="#ef4444" 
                  fill="#ef4444" 
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ResultsCharts;
