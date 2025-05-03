
import React, { useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { SimulationParams, PatientClass, SurgeryCaseInput } from '@/lib/simulation';
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Upload, FileInput, Calculator, FileJson } from "lucide-react";
import Papa from 'papaparse';

// Placeholder for data analysis result
interface CalibrationResult {
  message: string;
  updatedParams?: Partial<SimulationParams>; // Or specific calibrated values
}

interface DataCalibrationProps {
  currentParams: SimulationParams;
  onParamsUpdate: (updatedParams: Partial<SimulationParams>) => void;
  surgeryList?: SurgeryCaseInput[];
  onSurgeryListImport?: (surgeryList: SurgeryCaseInput[]) => void;
}

interface DurationData {
  [classId: string]: {
    surgeryDurations: number[];
    pacu1Durations: number[];
    pacu2Durations: number[];
    count: number;
  }
}

const DataCalibration: React.FC<DataCalibrationProps> = ({ 
  currentParams, 
  onParamsUpdate,
  surgeryList,
  onSurgeryListImport 
}) => {
  const [dataFile, setDataFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [calibrationResult, setCalibrationResult] = useState<CalibrationResult | null>(null);
  const [activeTab, setActiveTab] = useState("calibration");
  const exportParamsRef = useRef<HTMLAnchorElement>(null);
  const exportSurgeryRef = useRef<HTMLAnchorElement>(null);
  const importParamsRef = useRef<HTMLInputElement>(null);
  const importSurgeryRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (file.type === "text/csv") { // Basic check for CSV
        setDataFile(file);
        setCalibrationResult(null); // Clear previous results
      } else {
        toast({ title: "Virheellinen tiedostotyyppi", description: "Lataa CSV-tiedosto.", variant: "destructive" });
      }
    }
  };

  // Process and analyze CSV data
  const processCSVData = async (csvData: string): Promise<DurationData> => {
    return new Promise((resolve) => {
      // Parse CSV data
      Papa.parse(csvData, {
        header: true,
        complete: (results) => {
          const durationData: DurationData = {};
          
          // Process each row
          results.data.forEach((row: any) => {
            const classId = row.patient_class_id;
            const surgeryDuration = parseFloat(row.surgery_duration);
            const pacu1Duration = parseFloat(row.pacu1_duration);
            const pacu2Duration = parseFloat(row.pacu2_duration);
            
            // Skip rows with missing or invalid data
            if (!classId || isNaN(surgeryDuration) || isNaN(pacu1Duration) || isNaN(pacu2Duration)) {
              return;
            }
            
            // Initialize data structure for this class if not exists
            if (!durationData[classId]) {
              durationData[classId] = {
                surgeryDurations: [],
                pacu1Durations: [],
                pacu2Durations: [],
                count: 0
              };
            }
            
            // Add durations to arrays
            durationData[classId].surgeryDurations.push(surgeryDuration);
            durationData[classId].pacu1Durations.push(pacu1Duration);
            durationData[classId].pacu2Durations.push(pacu2Duration);
            durationData[classId].count++;
          });
          
          resolve(durationData);
        },
        error: (error) => {
          console.error("CSV parsing error:", error);
          toast({ 
            title: "CSV-käsittelyvirhe", 
            description: "Tiedoston jäsentämisessä tapahtui virhe.", 
            variant: "destructive" 
          });
          resolve({});
        }
      });
    });
  };
  
  // Calculate mean and standard deviation
  const calculateStats = (values: number[]): { mean: number, stdDev: number } => {
    if (values.length === 0) return { mean: 0, stdDev: 0 };
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    return { mean, stdDev };
  };

  const handleProcessData = useCallback(async () => {
    if (!dataFile) {
      toast({ title: "Ei tiedostoa", description: "Valitse ensin CSV-tiedosto.", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    setCalibrationResult(null);

    try {
      // Read file contents
      const fileContent = await dataFile.text();
      
      // Process CSV data
      const durationData = await processCSVData(fileContent);
      
      // Check if we have any valid data
      const classIds = Object.keys(durationData);
      if (classIds.length === 0) {
        throw new Error("Ei kelvollista dataa CSV-tiedostossa.");
      }
      
      // Prepare updated patient classes based on analysis
      const updatedPatientClasses = [...currentParams.patientClasses];
      let updatedCount = 0;
      
      // Update existing patient classes with calibrated values
      for (const classId of classIds) {
        const classIndex = updatedPatientClasses.findIndex(pc => pc.id === classId);
        if (classIndex !== -1) {
          const data = durationData[classId];
          
          // Calculate stats
          const surgeryStats = calculateStats(data.surgeryDurations);
          const pacu1Stats = calculateStats(data.pacu1Durations);
          const pacu2Stats = calculateStats(data.pacu2Durations);
          
          // Update patient class with calibrated values
          updatedPatientClasses[classIndex] = {
            ...updatedPatientClasses[classIndex],
            surgeryDurationMean: Math.round(surgeryStats.mean),
            surgeryDurationStdDev: Math.round(surgeryStats.stdDev),
            pacuPhase1DurationMean: Math.round(pacu1Stats.mean),
            pacuPhase1DurationStdDev: Math.round(pacu1Stats.stdDev),
            pacuPhase2DurationMean: Math.round(pacu2Stats.mean),
            pacuPhase2DurationStdDev: Math.round(pacu2Stats.stdDev)
          };
          updatedCount++;
        }
      }
      
      // Create updated params object
      const updatedParams: Partial<SimulationParams> = { 
        patientClasses: updatedPatientClasses 
      };

      // Set calibration result
      setCalibrationResult({
        message: `Tiedosto ${dataFile.name} käsitelty. Päivitetty ${updatedCount}/${classIds.length} potilasluokkaa.`,
        updatedParams: updatedParams
      });
      
      // Log results for debugging
      console.log("Data analysis complete:", durationData);
      console.log("Updated patient classes:", updatedPatientClasses);
      
    } catch (error) {
      console.error("Data processing error:", error);
      setCalibrationResult({ message: `Virhe tiedoston käsittelyssä: ${error instanceof Error ? error.message : 'Tuntematon virhe'}` });
      toast({ 
        title: "Käsittelyvirhe", 
        description: `Tiedoston ${dataFile.name} käsittely epäonnistui.`, 
        variant: "destructive" 
      });
    } finally {
      setIsProcessing(false);
    }
  }, [dataFile, currentParams]);
  
  const applyCalibration = () => {
    if (calibrationResult?.updatedParams) {
      onParamsUpdate(calibrationResult.updatedParams);
      toast({ 
        title: "Parametrit päivitetty", 
        description: "Kalibroidut parametrit otettu käyttöön." 
      });
    } else {
      toast({ 
        title: "Ei päivityksiä", 
        description: "Kalibrointia ei voitu soveltaa.", 
        variant: "destructive" 
      });
    }
  };

  // Export parameters as JSON file
  const handleExportParams = () => {
    const dataStr = JSON.stringify(currentParams, null, 2);
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
    
    if (exportParamsRef.current) {
      exportParamsRef.current.setAttribute("href", dataUri);
      exportParamsRef.current.setAttribute("download", "simulation_params.json");
      exportParamsRef.current.click();
    }
    
    toast({ 
      title: "Parametrit viety", 
      description: "Simulaation parametrit tallennettu JSON-tiedostoon." 
    });
  };
  
  // Export surgery list as CSV file
  const handleExportSurgeryList = () => {
    if (!surgeryList || surgeryList.length === 0) {
      toast({ 
        title: "Ei leikkauslistaa", 
        description: "Ei leikkauksia vietäväksi.", 
        variant: "destructive" 
      });
      return;
    }
    
    // Convert surgery list to CSV format
    const headers = ["id", "classId", "scheduledStartTime", "duration", "orRoom", "priority", "actualArrivalTime"];
    const csvRows = [headers.join(",")];
    
    surgeryList.forEach(surgery => {
      const values = headers.map(header => {
        const value = surgery[header as keyof SurgeryCaseInput];
        return value !== undefined ? value : "";
      });
      csvRows.push(values.join(","));
    });
    
    const csvContent = csvRows.join("\n");
    const dataUri = `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`;
    
    if (exportSurgeryRef.current) {
      exportSurgeryRef.current.setAttribute("href", dataUri);
      exportSurgeryRef.current.setAttribute("download", "surgery_list.csv");
      exportSurgeryRef.current.click();
    }
    
    toast({ 
      title: "Leikkauslista viety", 
      description: `${surgeryList.length} leikkausta viety CSV-tiedostoon.` 
    });
  };
  
  // Trigger file input for importing parameters
  const handleImportParamsClick = () => {
    if (importParamsRef.current) {
      importParamsRef.current.click();
    }
  };
  
  // Trigger file input for importing surgery list
  const handleImportSurgeryClick = () => {
    if (importSurgeryRef.current) {
      importSurgeryRef.current.click();
    }
  };
  
  // Import parameters from JSON file
  const handleImportParams = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const importedParams = JSON.parse(content) as SimulationParams;
        
        // Validate imported data (basic check)
        if (!importedParams.patientClasses || !Array.isArray(importedParams.patientClasses)) {
          throw new Error("Virheellinen parametritiedosto: patientClasses puuttuu tai on virheellinen");
        }
        
        onParamsUpdate(importedParams);
        toast({ 
          title: "Parametrit tuotu", 
          description: "Simulaation parametrit ladattu onnistuneesti." 
        });
      } catch (error) {
        console.error("Error importing params:", error);
        toast({ 
          title: "Tuontivirhe", 
          description: `Parametrien tuonti epäonnistui: ${error instanceof Error ? error.message : 'Virheellinen tiedosto'}`, 
          variant: "destructive" 
        });
      }
    };
    reader.readAsText(file);
    
    // Reset input value to allow reimport of the same file
    event.target.value = '';
  };
  
  // Import surgery list from CSV file
  const handleImportSurgeryList = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !onSurgeryListImport) return;
    
    Papa.parse(file, {
      header: true,
      complete: (results) => {
        try {
          // Convert parsed data to SurgeryCaseInput objects
          const importedSurgeries: SurgeryCaseInput[] = results.data
            .filter((row: any) => row.classId && row.orRoom) // Filter out empty rows
            .map((row: any, index: number) => ({
              id: row.id || `S-${index + 1}`,
              classId: row.classId,
              scheduledStartTime: parseInt(row.scheduledStartTime) || 0,
              duration: parseInt(row.duration) || 60,
              orRoom: row.orRoom,
              priority: parseInt(row.priority) || 3,
              actualArrivalTime: parseInt(row.actualArrivalTime) || 0
            }));
          
          if (importedSurgeries.length === 0) {
            throw new Error("Ei kelvollisia leikkauksia tiedostossa");
          }
          
          onSurgeryListImport(importedSurgeries);
          toast({ 
            title: "Leikkauslista tuotu", 
            description: `${importedSurgeries.length} leikkausta ladattu onnistuneesti.` 
          });
        } catch (error) {
          console.error("Error importing surgery list:", error);
          toast({ 
            title: "Tuontivirhe", 
            description: `Leikkauslistan tuonti epäonnistui: ${error instanceof Error ? error.message : 'Virheellinen tiedosto'}`, 
            variant: "destructive" 
          });
        }
      },
      error: (error) => {
        console.error("CSV parsing error:", error);
        toast({ 
          title: "CSV-käsittelyvirhe", 
          description: "Tiedoston jäsentämisessä tapahtui virhe.", 
          variant: "destructive" 
        });
      }
    });
    
    // Reset input value to allow reimport of the same file
    event.target.value = '';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Datan Tuonti ja Kalibrointi</CardTitle>
        <CardDescription>
          Lataa historiallista dataa kalibroidaksesi simulaation parametreja tai tuo/vie asetuksia
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="calibration">Kalibrointi</TabsTrigger>
            <TabsTrigger value="import-export">Tuonti/Vienti</TabsTrigger>
          </TabsList>
          
          <TabsContent value="calibration" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="data-file">Lataa Historiadata (CSV)</Label>
              <div className="text-sm text-muted-foreground mb-2">
                CSV-tiedosto tulee sisältää sarakkeet: patient_class_id, surgery_duration, pacu1_duration, pacu2_duration
              </div>
              <Input id="data-file" type="file" accept=".csv" onChange={handleFileChange} />
              {dataFile && <p className="text-sm text-muted-foreground">Valittu tiedosto: {dataFile.name}</p>}
            </div>
            
            <Button 
              onClick={handleProcessData} 
              disabled={!dataFile || isProcessing}
              className="flex items-center gap-2"
            >
              <Calculator className="h-4 w-4" />
              {isProcessing ? "Käsitellään..." : "Analysoi ja Kalibroi"}
            </Button>

            {calibrationResult && (
              <div className="mt-4 p-4 border rounded bg-muted">
                <p className="text-sm font-medium">Käsittelyn tulos:</p>
                <p className="text-sm text-muted-foreground">{calibrationResult.message}</p>
                {calibrationResult.updatedParams && (
                  <Button onClick={applyCalibration} size="sm" className="mt-2">
                    Ota kalibroidut parametrit käyttöön
                  </Button>
                )}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="import-export" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label className="mb-2 block">Simulaation Parametrit</Label>
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleImportParamsClick}
                    className="flex items-center gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    Tuo Parametrit (JSON)
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleExportParams}
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Vie Parametrit (JSON)
                  </Button>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <Label className="mb-2 block">Leikkauslista</Label>
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleImportSurgeryClick}
                    disabled={!onSurgeryListImport}
                    className="flex items-center gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    Tuo Leikkauslista (CSV)
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleExportSurgeryList}
                    disabled={!surgeryList || surgeryList.length === 0}
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Vie Leikkauslista (CSV)
                  </Button>
                </div>
              </div>
              
              <div className="text-sm text-muted-foreground mt-4 p-4 bg-muted rounded">
                <div className="font-medium mb-2 flex items-center gap-2">
                  <FileJson className="h-4 w-4" />
                  Tiedostomuodot
                </div>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Parametrit: JSON-tiedosto, joka sisältää kaikki simulaation asetukset</li>
                  <li>Leikkauslista: CSV-tiedosto, jossa sarakkeet id, classId, scheduledStartTime, duration, orRoom, priority, actualArrivalTime</li>
                </ul>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        {/* Hidden elements for file operations */}
        <a ref={exportParamsRef} style={{ display: 'none' }}></a>
        <a ref={exportSurgeryRef} style={{ display: 'none' }}></a>
        <input 
          type="file" 
          ref={importParamsRef} 
          style={{ display: 'none' }} 
          accept=".json" 
          onChange={handleImportParams} 
        />
        <input 
          type="file" 
          ref={importSurgeryRef} 
          style={{ display: 'none' }} 
          accept=".csv" 
          onChange={handleImportSurgeryList} 
        />
      </CardContent>
    </Card>
  );
};

export default DataCalibration;
