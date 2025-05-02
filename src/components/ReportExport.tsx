
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SimulationResults, SimulationParams, PatientClass } from '@/lib/simulation';
import { toast } from '@/components/ui/use-toast';

interface ReportExportProps {
  results: SimulationResults | null;
  params: SimulationParams;
  patientClasses: PatientClass[];
}

const ReportExport: React.FC<ReportExportProps> = ({
  results,
  params,
  patientClasses
}) => {
  const [reportTitle, setReportTitle] = useState('PACU Simulaatioraportti');
  const [selectedSections, setSelectedSections] = useState({
    summary: true,
    waitTimes: true,
    bedOccupancy: true,
    nurseUtilization: true,
    patientDistribution: true,
    peakTimes: true,
    parameters: false
  });
  const [exportFormat, setExportFormat] = useState<'pdf' | 'excel'>('pdf');
  
  const handleSectionToggle = (section: keyof typeof selectedSections) => {
    setSelectedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };
  
  const generateReport = () => {
    if (!results) {
      toast({
        title: "Ei tuloksia",
        description: "Aja simulaatio ensin nähdäksesi tulokset.",
        variant: "destructive"
      });
      return;
    }
    
    toast({
      title: "Raportin luonti",
      description: `${exportFormat.toUpperCase()}-raportin luonti aloitettu...`
    });
    
    // In a real implementation, this would call a backend API to generate the report
    // For now, we'll just simulate a delay
    setTimeout(() => {
      // Create CSV data for Excel export
      if (exportFormat === 'excel') {
        generateCSV();
      } else {
        // For PDF, we'd normally call a PDF generation service
        simulatePDFDownload();
      }
    }, 1000);
  };
  
  const generateCSV = () => {
    // Generate CSV content based on selected sections
    let csvContent = `"${reportTitle}"\n\n`;
    
    if (selectedSections.summary) {
      csvContent += `"Yhteenveto"\n`;
      csvContent += `"Keskimääräinen vuodekäyttö","${Math.round(results!.meanBedOccupancy * 100)}%"\n`;
      csvContent += `"Maksimi vuodekäyttö","${Math.round(results!.maxBedOccupancy * 100)}%"\n`;
      csvContent += `"Keskimääräinen odotusaika","${Math.round(results!.meanWaitTime)} min"\n`;
      csvContent += `"P95 odotusaika","${Math.round(results!.p95WaitTime)} min"\n\n`;
    }
    
    if (selectedSections.patientDistribution) {
      csvContent += `"Potilasjakauma"\n`;
      csvContent += `"Potilasluokka","Määrä","Prosentti"\n`;
      
      const totalPatients = Object.values(results!.patientTypeCount).reduce((sum, count) => sum + count, 0);
      
      patientClasses.forEach(pc => {
        const count = results!.patientTypeCount[pc.id] || 0;
        const percentage = totalPatients > 0 ? (count / totalPatients) * 100 : 0;
        csvContent += `"${pc.name}","${count}","${percentage.toFixed(1)}%"\n`;
      });
      
      csvContent += `\n`;
    }
    
    if (selectedSections.parameters) {
      csvContent += `"Simulaation parametrit"\n`;
      csvContent += `"Vuodepaikat","${params.beds}"\n`;
      csvContent += `"Hoitajat","${params.nurses}"\n`;
      csvContent += `"Hoitaja-potilas suhde","${params.nursePatientRatio}"\n`;
      csvContent += `"Simulaatiopäivät","${params.simulationDays}"\n`;
      csvContent += `\n`;
    }
    
    // Create downloadable CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${reportTitle.replace(/\s+/g, '_')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Excel-raportti valmis",
      description: "CSV-tiedosto on ladattu."
    });
  };
  
  const simulatePDFDownload = () => {
    // In a real implementation, this would generate a PDF
    // For now, we'll just show a toast message
    toast({
      title: "PDF-raportti valmis",
      description: "Toiminto ei ole vielä käytettävissä tässä demossa."
    });
  };
  
  if (!results) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-40">
          <p className="text-muted-foreground">
            Aja simulaatio ensin nähdäksesi tulokset.
          </p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Raportin vienti</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div>
            <Label htmlFor="report-title">Raportin otsikko</Label>
            <Input 
              id="report-title"
              value={reportTitle}
              onChange={e => setReportTitle(e.target.value)}
              className="mt-1"
            />
          </div>
          
          <div>
            <Label>Vientiformaatti</Label>
            <Select 
              value={exportFormat} 
              onValueChange={(value: 'pdf' | 'excel') => setExportFormat(value)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF-dokumentti</SelectItem>
                <SelectItem value="excel">Excel (CSV)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label>Sisällytä raporttiin</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="summary" 
                  checked={selectedSections.summary} 
                  onCheckedChange={() => handleSectionToggle('summary')}
                />
                <Label htmlFor="summary">Yhteenveto</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="waitTimes" 
                  checked={selectedSections.waitTimes} 
                  onCheckedChange={() => handleSectionToggle('waitTimes')}
                />
                <Label htmlFor="waitTimes">Odotusaikajakauma</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="bedOccupancy" 
                  checked={selectedSections.bedOccupancy} 
                  onCheckedChange={() => handleSectionToggle('bedOccupancy')}
                />
                <Label htmlFor="bedOccupancy">Vuodekäyttö</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="nurseUtilization" 
                  checked={selectedSections.nurseUtilization} 
                  onCheckedChange={() => handleSectionToggle('nurseUtilization')}
                />
                <Label htmlFor="nurseUtilization">Hoitajakäyttö</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="patientDistribution" 
                  checked={selectedSections.patientDistribution} 
                  onCheckedChange={() => handleSectionToggle('patientDistribution')}
                />
                <Label htmlFor="patientDistribution">Potilasjakauma</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="peakTimes" 
                  checked={selectedSections.peakTimes} 
                  onCheckedChange={() => handleSectionToggle('peakTimes')}
                />
                <Label htmlFor="peakTimes">Ruuhkahuiput</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="parameters" 
                  checked={selectedSections.parameters} 
                  onCheckedChange={() => handleSectionToggle('parameters')}
                />
                <Label htmlFor="parameters">Simulaation parametrit</Label>
              </div>
            </div>
          </div>
          
          <div className="pt-4">
            <Button onClick={generateReport} className="w-full">
              Luo {exportFormat === 'pdf' ? 'PDF-raportti' : 'Excel-raportti'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReportExport;
