
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  TooltipProps
} from 'recharts';
import { AnalyticsMetric } from '@/services/analyticsService';
import { Skeleton } from '@/components/ui/skeleton';

interface DataKey {
  key: string;
  name: string;
  color: string;
}

interface AnalyticsChartProps {
  title: string;
  description?: string;
  data: AnalyticsMetric[];
  type: 'line' | 'bar' | 'area';
  dataKeys: DataKey[];
  loading?: boolean;
  height?: number;
}

const AnalyticsChart: React.FC<AnalyticsChartProps> = ({
  title,
  description,
  data,
  type,
  dataKeys,
  loading = false,
  height = 300,
}) => {
  const dateFormatter = (date: string) => {
    return new Date(date).toLocaleDateString('en-IN', { 
      day: '2-digit',
      month: 'short'
    });
  };
  
  const renderChart = () => {
    if (loading) {
      return (
        <div className="w-full" style={{ height }}>
          <Skeleton className="w-full h-full" />
        </div>
      );
    }
    
    const chartProps = {
      data,
      margin: { top: 10, right: 30, left: 0, bottom: 0 },
    };
    
    const commonProps = {
      strokeWidth: 2,
      dot: { strokeWidth: 2, r: 3 },
    };
    
    switch (type) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart {...chartProps}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis 
                dataKey="date" 
                tickFormatter={dateFormatter} 
                tick={{ fontSize: 12 }}
                stroke="#888"
              />
              <YAxis tick={{ fontSize: 12 }} stroke="#888" />
              <Tooltip formatter={(value: any) => [value, '']} labelFormatter={(label) => dateFormatter(String(label))} />
              <Legend />
              {dataKeys.map((dk) => (
                <Line
                  key={dk.key}
                  type="monotone"
                  dataKey={dk.key}
                  name={dk.name}
                  stroke={dk.color}
                  {...commonProps}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );
      
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart {...chartProps}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis 
                dataKey="date" 
                tickFormatter={dateFormatter} 
                tick={{ fontSize: 12 }}
                stroke="#888"
              />
              <YAxis tick={{ fontSize: 12 }} stroke="#888" />
              <Tooltip formatter={(value: any) => [value, '']} labelFormatter={(label) => dateFormatter(String(label))} />
              <Legend />
              {dataKeys.map((dk, index) => (
                <Bar
                  key={dk.key}
                  dataKey={dk.key}
                  name={dk.name}
                  fill={dk.color}
                  barSize={20}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );
      
      case 'area':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <AreaChart {...chartProps}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis 
                dataKey="date" 
                tickFormatter={dateFormatter} 
                tick={{ fontSize: 12 }}
                stroke="#888"
              />
              <YAxis tick={{ fontSize: 12 }} stroke="#888" />
              <Tooltip formatter={(value: any) => [value, '']} labelFormatter={(label) => dateFormatter(String(label))} />
              <Legend />
              {dataKeys.map((dk) => (
                <Area
                  key={dk.key}
                  type="monotone"
                  dataKey={dk.key}
                  name={dk.name}
                  stroke={dk.color}
                  fill={dk.color}
                  fillOpacity={0.2}
                  {...commonProps}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        );
      
      default:
        return null;
    }
  };
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium">{title}</CardTitle>
        {description && (
          <CardDescription>{description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="p-2 pt-0">{renderChart()}</CardContent>
    </Card>
  );
};

export default AnalyticsChart;
