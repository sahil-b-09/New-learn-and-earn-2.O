
import React from 'react';
import { Button } from '@/components/ui/button';
import { TIMEFRAMES, AnalyticsTimeframe } from '@/services/analyticsService';

interface AnalyticsPeriodSelectorProps {
  selectedPeriod?: AnalyticsTimeframe;
  selectedDays?: number; // Added this prop
  onChange?: (period: AnalyticsTimeframe) => void;
  onSelectDays?: (days: number) => void; // Added this prop
}

const AnalyticsPeriodSelector: React.FC<AnalyticsPeriodSelectorProps> = ({
  selectedPeriod,
  selectedDays,
  onChange,
  onSelectDays
}) => {
  // Handle both types of APIs - either days or period
  const handleSelection = (timeframe: AnalyticsTimeframe) => {
    if (onChange) {
      onChange(timeframe);
    }
    
    if (onSelectDays) {
      // Convert timeframe to days
      let days;
      switch (timeframe) {
        case '7d': days = 7; break;
        case '30d': days = 30; break;
        case '90d': days = 90; break;
        case 'all': days = 365; break;
        default: days = 30;
      }
      onSelectDays(days);
    }
  };
  
  // Determine which selection is active
  const isActive = (timeframe: AnalyticsTimeframe) => {
    if (selectedPeriod) {
      return selectedPeriod === timeframe;
    }
    
    if (selectedDays) {
      switch (timeframe) {
        case '7d': return selectedDays === 7;
        case '30d': return selectedDays === 30;
        case '90d': return selectedDays === 90;
        case 'all': return selectedDays === 365;
        default: return false;
      }
    }
    
    return false;
  };
  
  return (
    <div className="flex flex-wrap gap-2">
      {TIMEFRAMES.map((timeframe) => (
        <Button
          key={timeframe.value}
          variant={isActive(timeframe.value as AnalyticsTimeframe) ? "default" : "outline"}
          className={isActive(timeframe.value as AnalyticsTimeframe) ? "bg-[#00C853] hover:bg-[#00A846]" : ""}
          onClick={() => handleSelection(timeframe.value as AnalyticsTimeframe)}
          size="sm"
        >
          {timeframe.label}
        </Button>
      ))}
    </div>
  );
};

export default AnalyticsPeriodSelector;
