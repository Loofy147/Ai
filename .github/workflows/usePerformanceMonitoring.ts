import { useState, useCallback, useRef, useEffect } from 'react';
import { PerformanceLogEntry, ResourceUsage } from '../types';

interface PerformanceConfig {
  enableLogging?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  metricsInterval?: number;
  maxLogEntries?: number;
}

interface PerformanceMetrics {
  cpu: number;
  memory: number;
  diskIO: number;
  networkIO: number;
  responseTime: number;
  throughput: number;
  errorRate: number;
}

interface AnomalyThresholds {
  cpu: number;
  memory: number;
  responseTime: number;
  errorRate: number;
}

export const usePerformanceMonitoring = (config: PerformanceConfig = {}) => {
  const [performanceLog, setPerformanceLog] = useState<PerformanceLogEntry[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [currentMetrics, setCurrentMetrics] = useState<PerformanceMetrics>({
    cpu: 0,
    memory: 0,
    diskIO: 0,
    networkIO: 0,
    responseTime: 0,
    throughput: 0,
    errorRate: 0
  });

  const monitoringIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const metricsHistoryRef = useRef<PerformanceMetrics[]>([]);
  const startTimeRef = useRef<number>(Date.now());
  const requestCountRef = useRef<number>(0);
  const errorCountRef = useRef<number>(0);

  const defaultThresholds: AnomalyThresholds = {
    cpu: 0.8,
    memory: 0.85,
    responseTime: 5000, // 5 seconds
    errorRate: 0.05 // 5%
  };

  // Start performance monitoring
  const startMonitoring = useCallback(async () => {
    if (isMonitoring) return;

    setIsMonitoring(true);
    startTimeRef.current = Date.now();
    
    const interval = config.metricsInterval || 5000; // Default 5 seconds
    
    monitoringIntervalRef.current = setInterval(() => {
      collectMetrics();
    }, interval);

    // Log monitoring start
    logEvent({
      id: crypto.randomUUID(),
      timestamp: new Date(),
      eventType: 'monitoring_started',
      status: 'success',
      details: { interval, config },
      resourceUsage: { cpu: 0, memory: 0, diskIO: 0, networkIO: 0 }
    });
  }, [config, isMonitoring]);

  // Stop performance monitoring
  const stopMonitoring = useCallback(() => {
    if (!isMonitoring) return;

    setIsMonitoring(false);
    
    if (monitoringIntervalRef.current) {
      clearInterval(monitoringIntervalRef.current);
      monitoringIntervalRef.current = null;
    }

    // Log monitoring stop
    logEvent({
      id: crypto.randomUUID(),
      timestamp: new Date(),
      eventType: 'monitoring_stopped',
      status: 'success',
      details: { 
        duration: Date.now() - startTimeRef.current,
        totalRequests: requestCountRef.current,
        totalErrors: errorCountRef.current
      },
      resourceUsage: currentMetrics
    });
  }, [isMonitoring, currentMetrics]);

  // Collect performance metrics
  const collectMetrics = useCallback(() => {
    const metrics: PerformanceMetrics = {
      cpu: getCPUUsage(),
      memory: getMemoryUsage(),
      diskIO: getDiskIOUsage(),
      networkIO: getNetworkIOUsage(),
      responseTime: getAverageResponseTime(),
      throughput: calculateThroughput(),
      errorRate: calculateErrorRate()
    };

    setCurrentMetrics(metrics);
    
    // Store in history (keep last 100 entries)
    metricsHistoryRef.current = [...metricsHistoryRef.current.slice(-99), metrics];

    // Log metrics if enabled
    if (config.enableLogging !== false) {
      logEvent({
        id: crypto.randomUUID(),
        timestamp: new Date(),
        eventType: 'metrics_collected',
        status: 'success',
        details: metrics,
        resourceUsage: {
          cpu: metrics.cpu,
          memory: metrics.memory,
          diskIO: metrics.diskIO,
          networkIO: metrics.networkIO
        }
      });
    }
  }, [config.enableLogging]);

  // Simulated metric collection functions (in real implementation, these would use actual system APIs)
  const getCPUUsage = (): number => {
    // Simulate CPU usage with some randomness and trends
    const baseUsage = 0.2 + Math.random() * 0.3;
    const timeVariation = Math.sin(Date.now() / 10000) * 0.1;
    return Math.max(0, Math.min(1, baseUsage + timeVariation));
  };

  const getMemoryUsage = (): number => {
    // Simulate memory usage that gradually increases
    const baseUsage = 0.3;
    const growth = (Date.now() - startTimeRef.current) / (1000 * 60 * 60) * 0.1; // 10% per hour
    const randomVariation = Math.random() * 0.1;
    return Math.max(0, Math.min(1, baseUsage + growth + randomVariation));
  };

  const getDiskIOUsage = (): number => {
    // Simulate disk I/O with spikes during file processing
    const baseIO = 0.1 + Math.random() * 0.2;
    return Math.max(0, Math.min(1, baseIO));
  };

  const getNetworkIOUsage = (): number => {
    // Simulate network I/O
    const baseIO = 0.05 + Math.random() * 0.15;
    return Math.max(0, Math.min(1, baseIO));
  };

  const getAverageResponseTime = (): number => {
    // Simulate response time in milliseconds
    const baseTime = 100 + Math.random() * 200;
    const loadFactor = currentMetrics.cpu * 500; // Higher CPU = slower response
    return baseTime + loadFactor;
  };

  const calculateThroughput = (): number => {
    // Calculate requests per second
    const elapsedSeconds = (Date.now() - startTimeRef.current) / 1000;
    return elapsedSeconds > 0 ? requestCountRef.current / elapsedSeconds : 0;
  };

  const calculateErrorRate = (): number => {
    // Calculate error rate as percentage
    return requestCountRef.current > 0 ? errorCountRef.current / requestCountRef.current : 0;
  };

  // Log performance events
  const logEvent = useCallback((entry: PerformanceLogEntry) => {
    const logLevel = config.logLevel || 'info';
    const shouldLog = shouldLogLevel(entry.eventType, logLevel);
    
    if (!shouldLog) return;

    setPerformanceLog(prev => {
      const maxEntries = config.maxLogEntries || 1000;
      const newLog = [...prev, entry];
      
      // Keep only the most recent entries
      if (newLog.length > maxEntries) {
        return newLog.slice(-maxEntries);
      }
      
      return newLog;
    });
  }, [config.logLevel, config.maxLogEntries]);

  // Determine if event should be logged based on level
  const shouldLogLevel = (eventType: string, logLevel: string): boolean => {
    const eventLevels: Record<string, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };

    const configLevels: Record<string, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };

    const eventLevel = eventType.includes('error') ? 3 : 
                      eventType.includes('warn') || eventType.includes('anomaly') ? 2 : 1;
    
    return eventLevel >= (configLevels[logLevel] || 1);
  };

  // Get current performance metrics
  const getPerformanceMetrics = useCallback(async (): Promise<PerformanceMetrics> => {
    return currentMetrics;
  }, [currentMetrics]);

  // Detect performance anomalies
  const detectAnomalies = useCallback(async (metrics: PerformanceMetrics): Promise<PerformanceLogEntry[]> => {
    const anomalies: PerformanceLogEntry[] = [];
    const thresholds = defaultThresholds;

    // CPU anomaly detection
    if (metrics.cpu > thresholds.cpu) {
      anomalies.push({
        id: crypto.randomUUID(),
        timestamp: new Date(),
        eventType: 'cpu_anomaly',
        status: 'warning',
        details: {
          currentCPU: metrics.cpu,
          threshold: thresholds.cpu,
          severity: metrics.cpu > 0.95 ? 'critical' : 'warning'
        },
        resourceUsage: {
          cpu: metrics.cpu,
          memory: metrics.memory,
          diskIO: metrics.diskIO,
          networkIO: metrics.networkIO
        }
      });
    }

    // Memory anomaly detection
    if (metrics.memory > thresholds.memory) {
      anomalies.push({
        id: crypto.randomUUID(),
        timestamp: new Date(),
        eventType: 'memory_anomaly',
        status: 'warning',
        details: {
          currentMemory: metrics.memory,
          threshold: thresholds.memory,
          severity: metrics.memory > 0.95 ? 'critical' : 'warning'
        },
        resourceUsage: {
          cpu: metrics.cpu,
          memory: metrics.memory,
          diskIO: metrics.diskIO,
          networkIO: metrics.networkIO
        }
      });
    }

    // Response time anomaly detection
    if (metrics.responseTime > thresholds.responseTime) {
      anomalies.push({
        id: crypto.randomUUID(),
        timestamp: new Date(),
        eventType: 'response_time_anomaly',
        status: 'warning',
        details: {
          currentResponseTime: metrics.responseTime,
          threshold: thresholds.responseTime,
          severity: metrics.responseTime > 10000 ? 'critical' : 'warning'
        },
        resourceUsage: {
          cpu: metrics.cpu,
          memory: metrics.memory,
          diskIO: metrics.diskIO,
          networkIO: metrics.networkIO
        }
      });
    }

    // Error rate anomaly detection
    if (metrics.errorRate > thresholds.errorRate) {
      anomalies.push({
        id: crypto.randomUUID(),
        timestamp: new Date(),
        eventType: 'error_rate_anomaly',
        status: 'warning',
        details: {
          currentErrorRate: metrics.errorRate,
          threshold: thresholds.errorRate,
          severity: metrics.errorRate > 0.1 ? 'critical' : 'warning'
        },
        resourceUsage: {
          cpu: metrics.cpu,
          memory: metrics.memory,
          diskIO: metrics.diskIO,
          networkIO: metrics.networkIO
        }
      });
    }

    // Trend-based anomaly detection
    if (metricsHistoryRef.current.length >= 5) {
      const recentMetrics = metricsHistoryRef.current.slice(-5);
      
      // Detect rapid CPU increase
      const cpuTrend = recentMetrics.map(m => m.cpu);
      const cpuIncrease = cpuTrend[cpuTrend.length - 1] - cpuTrend[0];
      if (cpuIncrease > 0.3) {
        anomalies.push({
          id: crypto.randomUUID(),
          timestamp: new Date(),
          eventType: 'cpu_trend_anomaly',
          status: 'warning',
          details: {
            trend: 'increasing',
            increase: cpuIncrease,
            timeWindow: '5 measurements'
          },
          resourceUsage: {
            cpu: metrics.cpu,
            memory: metrics.memory,
            diskIO: metrics.diskIO,
            networkIO: metrics.networkIO
          }
        });
      }

      // Detect memory leak pattern
      const memoryTrend = recentMetrics.map(m => m.memory);
      const memoryIncrease = memoryTrend[memoryTrend.length - 1] - memoryTrend[0];
      if (memoryIncrease > 0.2 && memoryTrend.every((val, i) => i === 0 || val >= memoryTrend[i - 1])) {
        anomalies.push({
          id: crypto.randomUUID(),
          timestamp: new Date(),
          eventType: 'memory_leak_anomaly',
          status: 'warning',
          details: {
            trend: 'consistent_increase',
            increase: memoryIncrease,
            pattern: 'potential_memory_leak'
          },
          resourceUsage: {
            cpu: metrics.cpu,
            memory: metrics.memory,
            diskIO: metrics.diskIO,
            networkIO: metrics.networkIO
          }
        });
      }
    }

    // Log detected anomalies
    anomalies.forEach(anomaly => {
      logEvent(anomaly);
    });

    return anomalies;
  }, [logEvent]);

  // Track request for throughput calculation
  const trackRequest = useCallback((isError: boolean = false) => {
    requestCountRef.current++;
    if (isError) {
      errorCountRef.current++;
    }
  }, []);

  // Get performance statistics
  const getPerformanceStats = useCallback(() => {
    const uptime = Date.now() - startTimeRef.current;
    const avgCPU = metricsHistoryRef.current.length > 0 
      ? metricsHistoryRef.current.reduce((sum, m) => sum + m.cpu, 0) / metricsHistoryRef.current.length
      : 0;
    const avgMemory = metricsHistoryRef.current.length > 0 
      ? metricsHistoryRef.current.reduce((sum, m) => sum + m.memory, 0) / metricsHistoryRef.current.length
      : 0;

    return {
      uptime,
      totalRequests: requestCountRef.current,
      totalErrors: errorCountRef.current,
      currentMetrics,
      averageMetrics: {
        cpu: avgCPU,
        memory: avgMemory
      },
      logEntries: performanceLog.length,
      isMonitoring
    };
  }, [currentMetrics, performanceLog.length, isMonitoring]);

  // Reset monitoring data
  const reset = useCallback(() => {
    setPerformanceLog([]);
    setCurrentMetrics({
      cpu: 0,
      memory: 0,
      diskIO: 0,
      networkIO: 0,
      responseTime: 0,
      throughput: 0,
      errorRate: 0
    });
    metricsHistoryRef.current = [];
    requestCountRef.current = 0;
    errorCountRef.current = 0;
    startTimeRef.current = Date.now();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (monitoringIntervalRef.current) {
        clearInterval(monitoringIntervalRef.current);
      }
    };
  }, []);

  return {
    performanceLog,
    currentMetrics,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    getPerformanceMetrics,
    detectAnomalies,
    trackRequest,
    getPerformanceStats,
    logEvent,
    reset
  };
};

