import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  MemorySystemState, 
  FileProcessingState, 
  PerformanceLogEntry,
  MemoryItem,
  ProcessingFile,
  ProcessedFile,
  FileMetadata
} from '../types';
import { MemoryService } from '../services/MemoryService';
import { FileProcessingService } from '../services/FileProcessingService';
import { PerformanceMonitor } from '../services/PerformanceMonitor';
import { useMemorySystem } from '../hooks/useMemorySystem';
import { useFileProcessing } from '../hooks/useFileProcessing';
import { usePerformanceMonitoring } from '../hooks/usePerformanceMonitoring';

interface IntegratedAISystemProps {
  config?: {
    memoryConfig?: {
      compressionRatio?: number;
      retentionThreshold?: number;
      cleanupInterval?: number;
    };
    fileConfig?: {
      maxFileSize?: number;
      supportedExtensions?: string[];
      processingQueueSize?: number;
    };
    performanceConfig?: {
      enableLogging?: boolean;
      logLevel?: 'debug' | 'info' | 'warn' | 'error';
      metricsInterval?: number;
    };
  };
  onMemoryUpdate?: (memoryState: MemorySystemState) => void;
  onFileProcessed?: (file: ProcessedFile) => void;
  onPerformanceAlert?: (alert: PerformanceLogEntry) => void;
}

export const IntegratedAISystem: React.FC<IntegratedAISystemProps> = ({
  config = {},
  onMemoryUpdate,
  onFileProcessed,
  onPerformanceAlert
}) => {
  // Enhanced state management with better type safety and initialization
  const [isInitialized, setIsInitialized] = useState(false);
  const [systemStatus, setSystemStatus] = useState<'initializing' | 'running' | 'paused' | 'error'>('initializing');
  const [errorState, setErrorState] = useState<string | null>(null);

  // Custom hooks for modular state management
  const {
    memorySystem,
    storeMemory,
    retrieveMemories,
    compressMemories,
    getMemoryStats
  } = useMemorySystem(config.memoryConfig);

  const {
    fileProcessing,
    addFileToQueue,
    processNextFile,
    getProcessingStats,
    clearProcessedFiles
  } = useFileProcessing(config.fileConfig);

  const {
    performanceLog,
    startMonitoring,
    stopMonitoring,
    getPerformanceMetrics,
    detectAnomalies
  } = usePerformanceMonitoring(config.performanceConfig);

  // Service instances with dependency injection
  const memoryServiceRef = useRef<MemoryService | null>(null);
  const fileServiceRef = useRef<FileProcessingService | null>(null);
  const performanceMonitorRef = useRef<PerformanceMonitor | null>(null);

  // Advanced initialization with error handling and dependency setup
  useEffect(() => {
    const initializeSystem = async () => {
      try {
        setSystemStatus('initializing');
        
        // Initialize services with configuration
        memoryServiceRef.current = new MemoryService({
          compressionRatio: config.memoryConfig?.compressionRatio || 0.7,
          retentionThreshold: config.memoryConfig?.retentionThreshold || 0.8,
          cleanupInterval: config.memoryConfig?.cleanupInterval || 300000
        });

        fileServiceRef.current = new FileProcessingService({
          maxFileSize: config.fileConfig?.maxFileSize || 50 * 1024 * 1024, // 50MB
          supportedExtensions: config.fileConfig?.supportedExtensions || [
            'tsx', 'ts', 'jsx', 'js', 'py', 'cpp', 'html', 'css', 'md', 'pdf', 
            'json', 'csv', 'xml', 'yaml', 'png', 'jpg', 'mp4', 'wav'
          ],
          processingQueueSize: config.fileConfig?.processingQueueSize || 100
        });

        performanceMonitorRef.current = new PerformanceMonitor({
          enableLogging: config.performanceConfig?.enableLogging ?? true,
          logLevel: config.performanceConfig?.logLevel || 'info',
          metricsInterval: config.performanceConfig?.metricsInterval || 5000
        });

        // Start monitoring and background processes
        await startMonitoring();
        
        setIsInitialized(true);
        setSystemStatus('running');
        setErrorState(null);
      } catch (error) {
        console.error('Failed to initialize Integrated AI System:', error);
        setErrorState(error instanceof Error ? error.message : 'Unknown initialization error');
        setSystemStatus('error');
      }
    };

    initializeSystem();

    // Cleanup function
    return () => {
      stopMonitoring();
      if (memoryServiceRef.current) {
        memoryServiceRef.current.cleanup();
      }
      if (fileServiceRef.current) {
        fileServiceRef.current.cleanup();
      }
      if (performanceMonitorRef.current) {
        performanceMonitorRef.current.cleanup();
      }
    };
  }, [config]);

  // Enhanced memory management with semantic search and intelligent compression
  const handleMemoryOperation = useCallback(async (
    operation: 'store' | 'retrieve' | 'compress',
    data?: any,
    query?: string
  ) => {
    if (!memoryServiceRef.current || !isInitialized) return;

    try {
      switch (operation) {
        case 'store':
          if (data) {
            const memoryItem: MemoryItem = {
              id: crypto.randomUUID(),
              content: data,
              timestamp: new Date(),
              accessCount: 0,
              importance: data.importance || 0.5,
              tags: data.tags || [],
              metadata: data.metadata || {}
            };
            await storeMemory(memoryItem);
            onMemoryUpdate?.(memorySystem);
          }
          break;
        
        case 'retrieve':
          if (query) {
            const results = await retrieveMemories(query, {
              limit: 10,
              threshold: 0.7,
              includeArchived: false
            });
            return results;
          }
          break;
        
        case 'compress':
          await compressMemories();
          onMemoryUpdate?.(memorySystem);
          break;
      }
    } catch (error) {
      console.error(`Memory operation '${operation}' failed:`, error);
      performanceMonitorRef.current?.logEvent({
        id: crypto.randomUUID(),
        timestamp: new Date(),
        eventType: 'memory_operation_error',
        status: 'failure',
        details: { operation, error: error instanceof Error ? error.message : 'Unknown error' },
        resourceUsage: { cpu: 0, memory: 0, diskIO: 0, networkIO: 0 }
      });
    }
  }, [memorySystem, storeMemory, retrieveMemories, compressMemories, onMemoryUpdate, isInitialized]);

  // Advanced file processing with content analysis and metadata extraction
  const handleFileUpload = useCallback(async (files: FileList) => {
    if (!fileServiceRef.current || !isInitialized) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      try {
        // Validate file before processing
        const validation = await fileServiceRef.current.validateFile(file);
        if (!validation.isValid) {
          console.warn(`File validation failed for ${file.name}:`, validation.errors);
          continue;
        }

        // Create processing file entry
        const processingFile: ProcessingFile = {
          id: crypto.randomUUID(),
          name: file.name,
          path: file.name, // In browser context, we use name as path
          size: file.size,
          type: file.type || 'application/octet-stream',
          status: 'pending',
          priority: 1
        };

        // Add to processing queue
        await addFileToQueue(processingFile);

        // Process file with content analysis
        const processedFile = await fileServiceRef.current.processFile(file, {
          extractMetadata: true,
          performContentAnalysis: true,
          generateSemanticTags: true,
          enableSecurityScanning: true
        });

        onFileProcessed?.(processedFile);

        // Store file metadata in memory system for future retrieval
        await handleMemoryOperation('store', {
          content: {
            fileId: processedFile.id,
            fileName: processedFile.name,
            metadata: processedFile.metadata,
            summary: processedFile.metadata.extractedText?.substring(0, 500)
          },
          importance: 0.6,
          tags: ['file', 'processed', ...(processedFile.metadata.semanticTags || [])],
          metadata: {
            source: 'file_processing',
            fileType: processedFile.type,
            processedAt: new Date().toISOString()
          }
        });

      } catch (error) {
        console.error(`File processing failed for ${file.name}:`, error);
        performanceMonitorRef.current?.logEvent({
          id: crypto.randomUUID(),
          timestamp: new Date(),
          eventType: 'file_processing_error',
          status: 'failure',
          details: { fileName: file.name, error: error instanceof Error ? error.message : 'Unknown error' },
          resourceUsage: { cpu: 0, memory: 0, diskIO: 0, networkIO: 0 }
        });
      }
    }
  }, [addFileToQueue, handleMemoryOperation, onFileProcessed, isInitialized]);

  // Performance monitoring and anomaly detection
  const handlePerformanceCheck = useCallback(async () => {
    if (!performanceMonitorRef.current || !isInitialized) return;

    try {
      const metrics = await getPerformanceMetrics();
      const anomalies = await detectAnomalies(metrics);

      if (anomalies.length > 0) {
        anomalies.forEach(anomaly => {
          onPerformanceAlert?.(anomaly);
        });
      }

      // Auto-optimize based on performance metrics
      if (metrics.memory > 0.8) {
        await handleMemoryOperation('compress');
      }

      if (metrics.cpu > 0.9) {
        // Reduce processing queue size temporarily
        fileServiceRef.current?.adjustProcessingRate(0.5);
      }

    } catch (error) {
      console.error('Performance check failed:', error);
    }
  }, [getPerformanceMetrics, detectAnomalies, handleMemoryOperation, onPerformanceAlert, isInitialized]);

  // Periodic performance monitoring
  useEffect(() => {
    if (!isInitialized || systemStatus !== 'running') return;

    const performanceInterval = setInterval(handlePerformanceCheck, 30000); // Check every 30 seconds

    return () => clearInterval(performanceInterval);
  }, [isInitialized, systemStatus, handlePerformanceCheck]);

  // System control functions
  const pauseSystem = useCallback(() => {
    setSystemStatus('paused');
    stopMonitoring();
  }, [stopMonitoring]);

  const resumeSystem = useCallback(async () => {
    setSystemStatus('running');
    await startMonitoring();
  }, [startMonitoring]);

  const resetSystem = useCallback(async () => {
    try {
      setSystemStatus('initializing');
      
      // Clear all data
      memoryServiceRef.current?.reset();
      fileServiceRef.current?.reset();
      performanceMonitorRef.current?.reset();
      
      // Restart monitoring
      await startMonitoring();
      
      setSystemStatus('running');
      setErrorState(null);
    } catch (error) {
      console.error('System reset failed:', error);
      setErrorState(error instanceof Error ? error.message : 'Reset failed');
      setSystemStatus('error');
    }
  }, [startMonitoring]);

  // Export system state and data
  const exportSystemData = useCallback(async () => {
    if (!isInitialized) return null;

    try {
      const exportData = {
        timestamp: new Date().toISOString(),
        memorySystem: memorySystem,
        fileProcessing: {
          ...fileProcessing,
          // Convert Maps to objects for JSON serialization
          locations: Object.fromEntries(fileProcessing.locations),
          encoding: Object.fromEntries(fileProcessing.encoding)
        },
        performanceLog: performanceLog.slice(-1000), // Last 1000 entries
        systemStatus,
        configuration: config
      };

      return exportData;
    } catch (error) {
      console.error('Export failed:', error);
      return null;
    }
  }, [memorySystem, fileProcessing, performanceLog, systemStatus, config, isInitialized]);

  // Render system status and controls
  if (!isInitialized) {
    return (
      <div className="integrated-ai-system initializing">
        <div className="status-indicator">
          <div className="spinner"></div>
          <span>Initializing Integrated AI System...</span>
        </div>
      </div>
    );
  }

  if (systemStatus === 'error') {
    return (
      <div className="integrated-ai-system error">
        <div className="error-display">
          <h3>System Error</h3>
          <p>{errorState}</p>
          <button onClick={resetSystem}>Reset System</button>
        </div>
      </div>
    );
  }

  return (
    <div className="integrated-ai-system">
      <div className="system-header">
        <h2>Integrated AI System</h2>
        <div className="system-controls">
          <span className={`status-badge ${systemStatus}`}>{systemStatus}</span>
          {systemStatus === 'running' && (
            <button onClick={pauseSystem}>Pause</button>
          )}
          {systemStatus === 'paused' && (
            <button onClick={resumeSystem}>Resume</button>
          )}
          <button onClick={resetSystem}>Reset</button>
          <button onClick={exportSystemData}>Export Data</button>
        </div>
      </div>

      <div className="system-dashboard">
        <div className="memory-panel">
          <h3>Memory System</h3>
          <div className="memory-stats">
            <div className="stat">
              <label>Short-term:</label>
              <span>{memorySystem.shortTerm.length}</span>
            </div>
            <div className="stat">
              <label>Long-term:</label>
              <span>{memorySystem.longTerm.length}</span>
            </div>
            <div className="stat">
              <label>Archive:</label>
              <span>{memorySystem.archive.length}</span>
            </div>
            <div className="stat">
              <label>Compression Ratio:</label>
              <span>{(memorySystem.compressionRatio * 100).toFixed(1)}%</span>
            </div>
          </div>
          <button onClick={() => handleMemoryOperation('compress')}>
            Compress Memories
          </button>
        </div>

        <div className="file-processing-panel">
          <h3>File Processing</h3>
          <div className="file-stats">
            <div className="stat">
              <label>Queue:</label>
              <span>{fileProcessing.queue.length}</span>
            </div>
            <div className="stat">
              <label>Processed:</label>
              <span>{fileProcessing.processed.length}</span>
            </div>
            <div className="categories">
              {Object.entries(fileProcessing.categories).map(([category, data]) => (
                <div key={category} className="category-stat">
                  <label>{category}:</label>
                  <span>{data.count}</span>
                </div>
              ))}
            </div>
          </div>
          <input
            type="file"
            multiple
            onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
            accept="*/*"
          />
        </div>

        <div className="performance-panel">
          <h3>Performance Monitor</h3>
          <div className="performance-stats">
            <div className="stat">
              <label>Log Entries:</label>
              <span>{performanceLog.length}</span>
            </div>
            <div className="stat">
              <label>System Status:</label>
              <span className={systemStatus}>{systemStatus}</span>
            </div>
          </div>
          <button onClick={handlePerformanceCheck}>
            Check Performance
          </button>
        </div>
      </div>
    </div>
  );
};

export default IntegratedAISystem;

