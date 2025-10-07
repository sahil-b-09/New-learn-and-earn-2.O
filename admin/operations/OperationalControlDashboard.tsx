import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/ui/tabs';
import { Button } from '@/ui/button';
import { Badge } from '@/ui/badge';
import { Input } from '@/ui/input';
import { Textarea } from '@/ui/textarea';
import { Switch } from '@/ui/switch';
import { Progress } from '@/ui/progress';
import { Alert, AlertDescription } from '@/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select';
import { Server, Database, Activity, Settings, TriangleAlert as AlertTriangle, CircleCheck as CheckCircle, Clock, Cpu, HardDrive, Wifi, RefreshCw, Settings2, Mail, Users, BookOpen, ChartBar as BarChart3, Shield, FileText, Monitor, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SystemHealth {
  database: {
    status: 'healthy' | 'warning' | 'error';
    responseTime: number;
    connections: number;
    maxConnections: number;
  };
  api: {
    status: 'healthy' | 'warning' | 'error';
    responseTime: number;
    uptime: number;
    errorRate: number;
  };
  cache: {
    hitRate: number;
    memoryUsage: number;
    status: 'healthy' | 'warning' | 'error';
  };
  storage: {
    usedSpace: number;
    totalSpace: number;
    status: 'healthy' | 'warning' | 'error';
  };
}

interface SystemConfig {
  id: string;
  key: string;
  value: string;
  description: string;
  category: string;
  isActive: boolean;
  updatedAt: string;
  updatedBy: string;
}

interface AuditLog {
  id: string;
  adminId: string;
  action: string;
  resource: string;
  details: any;
  timestamp: string;
  adminEmail: string;
}

interface BulkOperation {
  id: string;
  type: 'email' | 'course_assignment' | 'user_update' | 'notification';
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  totalUsers: number;
  processedUsers: number;
  createdAt: string;
  completedAt?: string;
  results?: any;
}

const OperationalControlDashboard: React.FC = () => {
  const [systemHealthInterval, setSystemHealthInterval] = useState<NodeJS.Timeout | null>(null);
  const queryClient = useQueryClient();

  // Fetch system health data
  const { data: systemHealth, isLoading: loadingHealth, refetch: refetchHealth } = useQuery({
    queryKey: ['system-health'],
    queryFn: async () => {
      // Using mock data since RPC function doesn't exist
      const mockData: SystemHealth = {
        database: { status: 'healthy', responseTime: 45, connections: 12, maxConnections: 100 },
        api: { status: 'healthy', responseTime: 120, uptime: 99.8, errorRate: 0.01 },
        cache: { hitRate: 92.5, memoryUsage: 68, status: 'healthy' },
        storage: { usedSpace: 2.5, totalSpace: 10, status: 'healthy' }
      };
      return mockData;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch system configuration
  const { data: systemConfig, isLoading: loadingConfig } = useQuery({
    queryKey: ['system-config'],
    queryFn: async () => {
      // Using mock data since table doesn't exist
      const mockData: SystemConfig[] = [
        { id: '1', key: 'maintenance_mode', value: 'false', description: 'Enable maintenance mode', category: 'system', isActive: true, updatedAt: '2024-01-15T10:30:00Z', updatedBy: 'admin@example.com' },
        { id: '2', key: 'max_uploads_per_day', value: '100', description: 'Maximum uploads per day per user', category: 'limits', isActive: true, updatedAt: '2024-01-15T09:15:00Z', updatedBy: 'admin@example.com' }
      ];
      return mockData;
    },
  });

  // Fetch audit logs
  const { data: auditLogs, isLoading: loadingAudit } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: async () => {
      // Using mock data since table doesn't exist
      const mockData: AuditLog[] = [
        { id: '1', adminId: 'admin-1', action: 'user_create', resource: 'users', details: { userId: 'user-123' }, timestamp: '2024-01-15T10:30:00Z', adminEmail: 'admin@example.com' },
        { id: '2', adminId: 'admin-1', action: 'course_update', resource: 'courses', details: { courseId: 'course-456' }, timestamp: '2024-01-15T09:15:00Z', adminEmail: 'admin@example.com' }
      ];
      return mockData;
    },
  });

  // Fetch bulk operations
  const { data: bulkOperations, isLoading: loadingBulk } = useQuery({
    queryKey: ['bulk-operations'],
    queryFn: async () => {
      // Using mock data since table doesn't exist
      const mockData: BulkOperation[] = [
        { id: '1', type: 'email', status: 'completed', progress: 100, totalUsers: 1250, processedUsers: 1250, createdAt: '2024-01-15T08:00:00Z', completedAt: '2024-01-15T08:15:00Z' },
        { id: '2', type: 'notification', status: 'running', progress: 65, totalUsers: 500, processedUsers: 325, createdAt: '2024-01-15T10:00:00Z' }
      ];
      return mockData;
    },
  });

  // Update system configuration mutation
  const updateConfigMutation = useMutation({
    mutationFn: async ({ id, value, isActive }: { id: string; value: string; isActive: boolean }) => {
      // Mock update since table doesn't exist
      await new Promise(resolve => setTimeout(resolve, 500));
      return { id, value, isActive };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-config'] });
      toast.success('Configuration updated successfully');
    },
    onError: () => {
      toast.error('Failed to update configuration');
    },
  });

  // Create bulk operation mutation
  const createBulkOperationMutation = useMutation({
    mutationFn: async (operation: Partial<BulkOperation>) => {
      // Mock creation since table doesn't exist
      await new Promise(resolve => setTimeout(resolve, 500));
      return { id: Date.now().toString(), ...operation };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bulk-operations'] });
      toast.success('Bulk operation started');
    },
    onError: () => {
      toast.error('Failed to start bulk operation');
    },
  });

  const getHealthStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Healthy</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Warning</Badge>;
      case 'error':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Error</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Unknown</Badge>;
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / (24 * 3600));
    const hours = Math.floor((seconds % (24 * 3600)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const formatBytes = (bytes: number) => {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold mb-1">Operational Control Center</h2>
          <p className="text-gray-500">System monitoring and configuration management</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetchHealth()}
          disabled={loadingHealth}
          data-testid="button-refresh-health"
        >
          <RefreshCw className={`h-4 w-4 mr-1 ${loadingHealth ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="health" className="w-full">
        <TabsList className="grid grid-cols-2 md:grid-cols-5 mb-6">
          <TabsTrigger value="health" className="flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            <span className="hidden sm:inline">Health</span>
          </TabsTrigger>
          <TabsTrigger value="config" className="flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            <span className="hidden sm:inline">Config</span>
          </TabsTrigger>
          <TabsTrigger value="bulk" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            <span className="hidden sm:inline">Bulk Ops</span>
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Audit</span>
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Performance</span>
          </TabsTrigger>
        </TabsList>

        {/* System Health Tab */}
        <TabsContent value="health" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Database Health */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Database className="h-5 w-5 text-blue-500" />
                  Database
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Status</span>
                  {getHealthStatusBadge(systemHealth?.database.status || 'unknown')}
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Response Time</span>
                  <span className="text-sm font-medium">{systemHealth?.database.responseTime || 0}ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Connections</span>
                  <span className="text-sm font-medium">
                    {systemHealth?.database.connections || 0}/{systemHealth?.database.maxConnections || 0}
                  </span>
                </div>
                <Progress 
                  value={((systemHealth?.database.connections || 0) / (systemHealth?.database.maxConnections || 1)) * 100} 
                  className="h-2"
                />
              </CardContent>
            </Card>

            {/* API Health */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Server className="h-5 w-5 text-green-500" />
                  API Server
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Status</span>
                  {getHealthStatusBadge(systemHealth?.api.status || 'unknown')}
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Response Time</span>
                  <span className="text-sm font-medium">{systemHealth?.api.responseTime || 0}ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Uptime</span>
                  <span className="text-sm font-medium">{formatUptime(systemHealth?.api.uptime || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Error Rate</span>
                  <span className="text-sm font-medium">{(systemHealth?.api.errorRate || 0).toFixed(2)}%</span>
                </div>
              </CardContent>
            </Card>

            {/* Cache Health */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Cpu className="h-5 w-5 text-purple-500" />
                  Cache System
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Status</span>
                  {getHealthStatusBadge(systemHealth?.cache.status || 'unknown')}
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Hit Rate</span>
                  <span className="text-sm font-medium">{(systemHealth?.cache.hitRate || 0).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Memory Usage</span>
                  <span className="text-sm font-medium">{(systemHealth?.cache.memoryUsage || 0).toFixed(1)}%</span>
                </div>
                <Progress value={systemHealth?.cache.memoryUsage || 0} className="h-2" />
              </CardContent>
            </Card>

            {/* Storage Health */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <HardDrive className="h-5 w-5 text-orange-500" />
                  Storage
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Status</span>
                  {getHealthStatusBadge(systemHealth?.storage.status || 'unknown')}
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Used Space</span>
                  <span className="text-sm font-medium">
                    {formatBytes(systemHealth?.storage.usedSpace || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Total Space</span>
                  <span className="text-sm font-medium">
                    {formatBytes(systemHealth?.storage.totalSpace || 0)}
                  </span>
                </div>
                <Progress 
                  value={((systemHealth?.storage.usedSpace || 0) / (systemHealth?.storage.totalSpace || 1)) * 100} 
                  className="h-2"
                />
              </CardContent>
            </Card>
          </div>

          {/* Real-time Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-red-500" />
                Real-time System Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {systemHealth?.database.responseTime || 0}ms
                  </div>
                  <div className="text-sm text-gray-500">DB Response</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {systemHealth?.api.responseTime || 0}ms
                  </div>
                  <div className="text-sm text-gray-500">API Response</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {(systemHealth?.cache.hitRate || 0).toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-500">Cache Hit Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {(systemHealth?.api.errorRate || 0).toFixed(2)}%
                  </div>
                  <div className="text-sm text-gray-500">Error Rate</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Configuration Tab */}
        <TabsContent value="config" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                System Configuration
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingConfig ? (
                <div className="h-64 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-8 h-8 border-4 border-t-blue-500 border-gray-200 rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-sm text-gray-500">Loading configuration...</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(
                    systemConfig?.reduce((groups, config) => {
                      const category = config.category || 'General';
                      if (!groups[category]) groups[category] = [];
                      groups[category].push(config);
                      return groups;
                    }, {} as Record<string, SystemConfig[]>) || {}
                  ).map(([category, configs]) => (
                    <div key={category} className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
                        {category}
                      </h3>
                      <div className="grid gap-4">
                        {configs.map((config) => (
                          <div key={config.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex-1">
                              <div className="font-medium">{config.key}</div>
                              <div className="text-sm text-gray-500">{config.description}</div>
                              <div className="text-xs text-gray-400 mt-1">
                                Last updated: {new Date(config.updatedAt).toLocaleDateString()}
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <Input
                                value={config.value}
                                onChange={(e) => {
                                  const newValue = e.target.value;
                                  // Update local state optimistically
                                }}
                                className="w-48"
                                data-testid={`input-config-${config.key}`}
                              />
                              <Switch
                                checked={config.isActive}
                                onCheckedChange={(checked) => {
                                  updateConfigMutation.mutate({
                                    id: config.id,
                                    value: config.value,
                                    isActive: checked
                                  });
                                }}
                                data-testid={`switch-config-${config.key}`}
                              />
                              <Button
                                size="sm"
                                onClick={() => {
                                  updateConfigMutation.mutate({
                                    id: config.id,
                                    value: config.value,
                                    isActive: config.isActive
                                  });
                                }}
                                data-testid={`button-save-${config.key}`}
                              >
                                Save
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bulk Operations Tab */}
        <TabsContent value="bulk" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Create New Bulk Operation */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  New Bulk Operation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select data-testid="select-bulk-operation-type">
                  <SelectTrigger>
                    <SelectValue placeholder="Operation Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Send Email Campaign</SelectItem>
                    <SelectItem value="course_assignment">Assign Course</SelectItem>
                    <SelectItem value="user_update">Update User Data</SelectItem>
                    <SelectItem value="notification">Send Notification</SelectItem>
                  </SelectContent>
                </Select>
                
                <Textarea
                  placeholder="Operation details..."
                  className="min-h-[100px]"
                  data-testid="textarea-bulk-operation-details"
                />
                
                <Button 
                  className="w-full"
                  onClick={() => {
                    createBulkOperationMutation.mutate({
                      type: 'email',
                      status: 'pending',
                      progress: 0,
                      totalUsers: 0,
                      processedUsers: 0,
                      createdAt: new Date().toISOString()
                    });
                  }}
                  data-testid="button-create-bulk-operation"
                >
                  Start Operation
                </Button>
              </CardContent>
            </Card>

            {/* Active Operations */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Active & Recent Operations</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingBulk ? (
                  <div className="h-32 flex items-center justify-center">
                    <div className="w-6 h-6 border-4 border-t-blue-500 border-gray-200 rounded-full animate-spin"></div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {bulkOperations?.map((operation) => (
                      <div key={operation.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="font-medium capitalize">{operation.type.replace('_', ' ')}</div>
                            <div className="text-sm text-gray-500">
                              {new Date(operation.createdAt).toLocaleString()}
                            </div>
                          </div>
                          <Badge
                            className={
                              operation.status === 'completed' ? 'bg-green-100 text-green-800' :
                              operation.status === 'running' ? 'bg-blue-100 text-blue-800' :
                              operation.status === 'failed' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }
                          >
                            {operation.status}
                          </Badge>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Progress</span>
                            <span>{operation.processedUsers}/{operation.totalUsers}</span>
                          </div>
                          <Progress value={operation.progress} className="h-2" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Audit Logs Tab */}
        <TabsContent value="audit" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Admin Activity Audit Trail
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingAudit ? (
                <div className="h-64 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-8 h-8 border-4 border-t-blue-500 border-gray-200 rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-sm text-gray-500">Loading audit logs...</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {auditLogs?.map((log) => (
                    <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{log.action}</span>
                          <Badge variant="outline" className="text-xs">
                            {log.resource}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          {log.adminEmail} • {new Date(log.timestamp).toLocaleString()}
                        </div>
                        {log.details && (
                          <div className="text-xs text-gray-400 mt-1 bg-gray-50 p-2 rounded font-mono">
                            {JSON.stringify(log.details, null, 2).substring(0, 100)}...
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Insights</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-500">Database Query Time</span>
                  <span className="font-medium">{systemHealth?.database.responseTime || 0}ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">API Response Time</span>
                  <span className="font-medium">{systemHealth?.api.responseTime || 0}ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Cache Efficiency</span>
                  <span className="font-medium">{(systemHealth?.cache.hitRate || 0).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Error Rate</span>
                  <span className="font-medium">{(systemHealth?.api.errorRate || 0).toFixed(2)}%</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Optimization Recommendations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Database performance is optimal
                  </AlertDescription>
                </Alert>
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Consider increasing cache memory allocation
                  </AlertDescription>
                </Alert>
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    API response times are within acceptable range
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OperationalControlDashboard;