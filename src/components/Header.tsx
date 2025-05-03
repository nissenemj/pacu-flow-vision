
import React from 'react';
import { Activity, BookOpen } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const Header: React.FC = () => {
  const scrollToAbbreviations = () => {
    const abbreviationSection = document.querySelector('.abbr-section');
    if (abbreviationSection) {
      abbreviationSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="bg-white shadow-sm">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-6 w-6 text-medical-teal" />
          <h1 className="text-xl font-semibold text-gray-900">PACU Flow Vision</h1>
        </div>
        <div className="flex items-center gap-4">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={scrollToAbbreviations}
                  className="text-xs flex items-center gap-1"
                >
                  <BookOpen className="h-3 w-3" />
                  Lyhenteet
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Näytä lyhenteiden selitykset</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <div className="text-sm text-gray-600">
            Heräämösimulointityökalu
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
