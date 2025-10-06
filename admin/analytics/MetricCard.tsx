
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowUpIcon, ArrowDownIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: number | string;
  change?: number;
  changeLabel?: string;
  prefix?: string;
  suffix?: string;
  loading?: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  changeLabel = 'vs. previous period',
  prefix = '',
  suffix = '',
  loading = false
}) => {
  const isPositive = typeof change === 'number' && change > 0;
  const isNegative = typeof change === 'number' && change < 0;
  const isNeutral = typeof change === 'number' && change === 0;
  
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <h3 className="text-sm font-medium text-gray-500 mb-2">{title}</h3>
        
        {loading ? (
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-24 mb-1"></div>
            <div className="h-4 bg-gray-100 rounded w-32"></div>
          </div>
        ) : (
          <>
            <p className="text-2xl font-bold mb-1">
              {prefix}{typeof value === 'number' ? value.toLocaleString() : value}{suffix}
            </p>
            
            {typeof change === 'number' && (
              <div className="flex items-center text-sm">
                <span 
                  className={`mr-1 flex items-center ${
                    isPositive ? 'text-green-600' : 
                    isNegative ? 'text-red-600' : 
                    'text-gray-500'
                  }`}
                >
                  {isPositive && <ArrowUpIcon className="h-3 w-3 mr-1" />}
                  {isNegative && <ArrowDownIcon className="h-3 w-3 mr-1" />}
                  {Math.abs(change)}%
                </span>
                <span className="text-gray-500">{changeLabel}</span>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default MetricCard;
