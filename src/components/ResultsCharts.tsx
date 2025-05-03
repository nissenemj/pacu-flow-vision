
import React from 'react';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SimulationResults, PatientClass, SimulationParams } from '@/lib/simulation';

interface ResultsChartsProps {
  results: SimulationResults;
  params: SimulationParams;
  chartType?: 'metrics' | 'occupancy';
}

const ResultsCharts: React.FC<ResultsChartsProps> = ({ results, params, chartType = 'metrics' }) => {
  if (!results) return <div>No results to display.</div>;
  
  // Helper to convert time series data to 24-hour format for charts
  const formatTimeSeriesFor24HourView = (data: Array<{time: number, count: number}>) => {
    const formattedData = [];
    // Initialize with 0 counts for all hours
    for (let hour = 0; hour < 24; hour++) {
      formattedData.push({
        hour,
        count: 0,
        label: `${hour}:00`,
      });
    }
    
    // Process data to fit into 24-hour buckets (fold multi-day data into 24-hour view)
    for (const point of data) {
      const hour = Math.floor(point.time / 60) % 24; // Convert minutes to hours, mod 24
      if (formattedData[hour]) {
        // Average or max? Using max for peak visualization
        formattedData[hour].count = Math.max(formattedData[hour].count, point.count);
      }
    }
    
    return formattedData;
  };

  // Process nurse utilization data for 24-hour view
  const processNurseData = () => {
    if (!results.nurseUtilizationData || !results.nurseUtilizationData.length) {
      return [];
    }
    
    const formattedData = [];
    for (let hour = 0; hour < 24; hour++) {
      formattedData.push({
        hour,
        utilization: 0, 
        label: `${hour}:00`,
      });
    }
    
    // Process nurse utilization data
    for (const point of results.nurseUtilizationData) {
      const hour = Math.floor(point.time / 60) % 24;
      const utilization = point.busyCount / params.staffParams.totalNurses;
      if (formattedData[hour]) {
        formattedData[hour].utilization = Math.max(formattedData[hour].utilization, utilization);
      }
    }
    
    return formattedData;
  };

  // Process bed occupancy data
  const pacu1Data = formatTimeSeriesFor24HourView(results.pacuPhase1OccupancyData || []);
  const pacu2Data = formatTimeSeriesFor24HourView(results.pacuPhase2OccupancyData || []);
  const wardData = formatTimeSeriesFor24HourView(results.wardOccupancyData || []);
  const nurseData = processNurseData();

  // Prepare data for OR utilization pie chart
  const orUtilizationData = Object.entries(results.orUtilization || {}).map(([key, value]) => ({
    name: key,
    value: value * 100 // Convert to percentage
  }));

  // Colors for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A4DE02', '#8884D8'];

  const renderMetricsCharts = () => (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Keskimääräinen OR-odotusaika</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(results.meanORWaitingTime)} min</div>
            <p className="text-xs text-muted-foreground">P95: {Math.round(results.p95ORWaitingTime)} min</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Keskimääräinen PACU-aika</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(results.meanPacuTime)} min</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Keskimääräinen osastosiirtoviive</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(results.meanWardTransferDelay)} min</div>
            <p className="text-xs text-muted-foreground">P95: {Math.round(results.p95WardTransferDelay)} min</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">PACU-estoaika</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(results.pacuBlockedTimeRatio * 100)}%</div>
            <p className="text-xs text-muted-foreground">Potilaat odottavat osastopaikkaa</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>OR-käyttöaste</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={orUtilizationData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${typeof value === 'number' ? value.toFixed(1) : value}%`}
                >
                  {orUtilizationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => {
                  return [`${typeof value === 'number' ? value.toFixed(1) : value}%`, 'Käyttöaste'];
                }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Keskimääräinen käyttöaste</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  { name: 'PACU P1', value: results.meanPacuPhase1BedOccupancy * 100 },
                  { name: 'PACU P2', value: results.meanPacuPhase2BedOccupancy * 100 },
                  { name: 'Ward', value: results.meanWardBedOccupancy * 100 },
                  { name: 'Nurses', value: results.meanNurseUtilization * 100 }
                ]}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis 
                  label={{ value: '%', angle: -90, position: 'insideLeft' }} 
                  domain={[0, 100]} 
                />
                <Tooltip formatter={(value) => {
                  return [`${typeof value === 'number' ? value.toFixed(1) : value}%`, 'Käyttöaste'];
                }} />
                <Bar dataKey="value" fill="#8884d8">
                  {[
                    <Cell key="pacu1" fill="#0088FE" />,
                    <Cell key="pacu2" fill="#00C49F" />,
                    <Cell key="ward" fill="#FFBB28" />,
                    <Cell key="nurses" fill="#FF8042" />
                  ]}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Potilasvirtaus</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <h4 className="font-medium mb-2">Valmistuneet leikkaukset</h4>
              <div className="text-3xl font-bold">{results.completedSurgeries.length}</div>
            </div>
            <div>
              <h4 className="font-medium mb-2">Peruutetut leikkaukset</h4>
              <div className="text-3xl font-bold">{results.cancelledSurgeries.length}</div>
            </div>
          </div>

          <h4 className="font-medium mb-2">Potilasluokat</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {params.patientClasses.map((pc) => {
              const count = results.completedSurgeries.filter(
                (s) => s.classId === pc.id
              ).length;
              return (
                <div key={pc.id} className="flex items-center space-x-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: pc.color }}
                  ></div>
                  <span>{pc.name}: </span>
                  <span className="font-bold">{count}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Kustannukset</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <h4 className="font-medium mb-2">Kokonaiskustannus</h4>
                <div className="text-3xl font-bold">
                  {new Intl.NumberFormat('fi-FI', { style: 'currency', currency: 'EUR' }).format(results.totalCost || 0)}
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">Kustannus / suoritettu leikkaus</h4>
                <div className="text-3xl font-bold">
                  {results.completedSurgeries.length ? new Intl.NumberFormat('fi-FI', { style: 'currency', currency: 'EUR' }).format(
                    (results.totalCost || 0) / results.completedSurgeries.length
                  ) : '€0.00'}
                </div>
              </div>
            </div>
            
            {results.costBreakdown && (
              <div className="mt-6">
                <h4 className="font-medium mb-4">Kustannuserittely</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={[
                      { name: 'OR', value: results.costBreakdown.orCost },
                      { name: 'PACU P1', value: results.costBreakdown.pacu1Cost },
                      { name: 'PACU P2', value: results.costBreakdown.pacu2Cost },
                      { name: 'Hoitajat', value: results.costBreakdown.nurseCost },
                      { name: 'Osastot', value: results.costBreakdown.wardCost },
                      { name: 'Peruutukset', value: results.costBreakdown.cancellationCost }
                    ]}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis 
                      label={{ value: '€', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip formatter={(value) => {
                      return [`€${typeof value === 'number' ? value.toFixed(2) : value}`, 'Kustannus'];
                    }} />
                    <Bar dataKey="value" fill="#8884d8">
                      {[
                        <Cell key="or" fill="#0088FE" />,
                        <Cell key="pacu1" fill="#00C49F" />,
                        <Cell key="pacu2" fill="#FFBB28" />,
                        <Cell key="nurses" fill="#FF8042" />,
                        <Cell key="ward" fill="#A4DE02" />,
                        <Cell key="cancel" fill="#8884D8" />
                      ]}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );

  const renderOccupancyCharts = () => (
    <div className="grid grid-cols-1 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>PACU Phase 1 käyttöaste (24h)</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={pacu1Data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis label={{ value: 'Beds', angle: -90, position: 'insideLeft' }} />
              <Tooltip labelFormatter={(label) => `Kellonaika: ${label}`} />
              <Line type="monotone" dataKey="count" stroke="#0088FE" name="PACU P1" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>PACU Phase 2 käyttöaste (24h)</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={pacu2Data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis label={{ value: 'Beds', angle: -90, position: 'insideLeft' }} />
              <Tooltip labelFormatter={(label) => `Kellonaika: ${label}`} />
              <Line type="monotone" dataKey="count" stroke="#00C49F" name="PACU P2" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Osastojen käyttöaste (24h)</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={wardData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis label={{ value: 'Beds', angle: -90, position: 'insideLeft' }} />
              <Tooltip labelFormatter={(label) => `Kellonaika: ${label}`} />
              <Line type="monotone" dataKey="count" stroke="#FFBB28" name="Ward" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Hoitajakäyttöaste (24h)</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={nurseData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis
                label={{ value: 'Utilization %', angle: -90, position: 'insideLeft' }}
                domain={[0, 1]}
                tickFormatter={(value) => `${(Number(value) * 100).toFixed(0)}%`}
              />
              <Tooltip
                formatter={(value) => {
                  return [`${typeof value === 'number' ? (value * 100).toFixed(1) : value}%`, 'Utilization'];
                }}
                labelFormatter={(label) => `Kellonaika: ${label}`}
              />
              <Line type="monotone" dataKey="utilization" stroke="#FF8042" name="Nurses" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="space-y-4">
      {chartType === 'metrics' ? renderMetricsCharts() : renderOccupancyCharts()}
    </div>
  );
};

export default ResultsCharts;
