export interface MemorySystemState {
  shortTerm: MemoryItem[];
  longTerm: MemoryItem[];
  archive: MemoryItem[];
  compressionRatio: number;
  retentionScore: number;
  cyclicCleanup: number;
}

export interface MemoryItem {
  id: string;
  content: any;
  timestamp: Date;
  accessCount: number;
  importance: number;
  tags: string[];
  metadata: Record<string, any>;
  retentionScore?: number;
  lastAccessed?: Date;
  compressionLevel?: number;
  semanticVector?: number[];
}

export interface FileProcessingState {
  queue: ProcessingFile[];
  processed: ProcessedFile[];
  categories: FileCategories;
  locations: Map<string, string>;
  encoding: Map<string, string>;
  statistics: ProcessingStatistics;
}

export interface ProcessingFile {
  id: string;
  name: string;
  path: string;
  size: number;
  type: string;
  status: 'pending' | 'processing' | 'completed' | 'error' | 'cancelled';
  priority: number;
  queuedAt: Date;
  estimatedProcessingTime?: number;
  dependencies?: string[];
}

export interface ProcessedFile extends ProcessingFile {
  processedAt: Date;
  processingDuration: number;
  metadata: FileMetadata;
  content?: any;
  errors?: string[];
  warnings?: string[];
  checksum: string;
  virusScanResult?: VirusScanResult;
}

export interface FileCategories {
  code: FileCategory;
  documents: FileCategory;
  data: FileCategory;
  multimedia: FileCategory;
  archives: FileCategory;
  executables: FileCategory;
}

export interface FileCategory {
  count: number;
  types: string[];
  totalSize: number;
  lastUpdated: Date;
  averageProcessingTime: number;
  successRate: number;
}

export interface FileMetadata {
  size: number;
  createdAt: Date;
  modifiedAt: Date;
  author?: string;
  encoding?: string;
  checksum: string;
  contentType: string;
  extractedText?: string;
  semanticTags?: string[];
  language?: string;
  quality?: number;
  thumbnail?: string;
  exifData?: Record<string, any>;
  dimensions?: {
    width: number;
    height: number;
  };
  duration?: number;
  bitrate?: number;
  codec?: string;
}

export interface VirusScanResult {
  isClean: boolean;
  threats: string[];
  scanEngine: string;
  scanDate: Date;
  confidence: number;
}

export interface ProcessingStatistics {
  totalProcessed: number;
  totalSize: number;
  averageProcessingTime: number;
  successRate: number;
  errorRate: number;
  throughput: number;
  peakProcessingTime: number;
  categoryCounts: Record<string, number>;
}

export interface PerformanceLogEntry {
  id: string;
  timestamp: Date;
  eventType: string;
  duration?: number;
  resourceUsage: ResourceUsage;
  status: 'success' | 'failure' | 'warning' | 'info';
  details: Record<string, any>;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  correlationId?: string;
  userId?: string;
  sessionId?: string;
}

export interface ResourceUsage {
  cpu: number;
  memory: number;
  diskIO: number;
  networkIO: number;
  heapUsed?: number;
  heapTotal?: number;
  external?: number;
  arrayBuffers?: number;
}

export interface SystemMetrics {
  uptime: number;
  totalRequests: number;
  activeConnections: number;
  memoryUsage: ResourceUsage;
  cpuUsage: number;
  diskSpace: {
    total: number;
    used: number;
    available: number;
  };
  networkStats: {
    bytesReceived: number;
    bytesSent: number;
    packetsReceived: number;
    packetsSent: number;
  };
}

export interface AlertConfiguration {
  id: string;
  name: string;
  description: string;
  condition: AlertCondition;
  actions: AlertAction[];
  enabled: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  cooldownPeriod: number;
  lastTriggered?: Date;
}

export interface AlertCondition {
  metric: string;
  operator: '>' | '<' | '=' | '>=' | '<=' | '!=';
  threshold: number;
  duration?: number;
  aggregation?: 'avg' | 'max' | 'min' | 'sum' | 'count';
}

export interface AlertAction {
  type: 'email' | 'webhook' | 'log' | 'callback';
  target: string;
  template?: string;
  parameters?: Record<string, any>;
}

export interface SearchQuery {
  query: string;
  filters?: SearchFilters;
  sort?: SearchSort;
  pagination?: SearchPagination;
  options?: SearchOptions;
}

export interface SearchFilters {
  categories?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  sizeRange?: {
    min: number;
    max: number;
  };
  tags?: string[];
  importance?: {
    min: number;
    max: number;
  };
  status?: string[];
}

export interface SearchSort {
  field: string;
  direction: 'asc' | 'desc';
}

export interface SearchPagination {
  page: number;
  limit: number;
  offset?: number;
}

export interface SearchOptions {
  includeArchived?: boolean;
  fuzzySearch?: boolean;
  semanticSearch?: boolean;
  highlightMatches?: boolean;
  includeMetadata?: boolean;
}

export interface SearchResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  limit: number;
  hasMore: boolean;
  searchTime: number;
  suggestions?: string[];
}

export interface SystemConfiguration {
  memory: MemoryConfiguration;
  fileProcessing: FileProcessingConfiguration;
  performance: PerformanceConfiguration;
  security: SecurityConfiguration;
  api: ApiConfiguration;
}

export interface MemoryConfiguration {
  shortTermCapacity: number;
  longTermCapacity: number;
  archiveCapacity: number;
  compressionRatio: number;
  retentionThreshold: number;
  cleanupInterval: number;
  enableSemanticSearch: boolean;
  vectorDimensions: number;
}

export interface FileProcessingConfiguration {
  maxFileSize: number;
  supportedExtensions: string[];
  processingQueueSize: number;
  maxConcurrentFiles: number;
  timeoutSeconds: number;
  enableVirusScanning: boolean;
  quarantineDirectory: string;
  tempDirectory: string;
}

export interface PerformanceConfiguration {
  enableLogging: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  metricsInterval: number;
  maxLogEntries: number;
  enableAnomalyDetection: boolean;
  alertThresholds: Record<string, number>;
}

export interface SecurityConfiguration {
  enableAuthentication: boolean;
  allowedOrigins: string[];
  rateLimiting: {
    requests: number;
    windowMs: number;
  };
  encryptionKey?: string;
  allowExecutables: boolean;
  quarantineExtensions: string[];
}

export interface ApiConfiguration {
  baseUrl: string;
  version: string;
  timeout: number;
  retryAttempts: number;
  enableCors: boolean;
  corsOptions: {
    origin: string | string[];
    methods: string[];
    allowedHeaders: string[];
  };
}

export interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp: Date;
  id: string;
  correlationId?: string;
}

export interface SystemEvent {
  id: string;
  type: string;
  source: string;
  timestamp: Date;
  data: any;
  severity: 'info' | 'warning' | 'error' | 'critical';
  tags: string[];
}

export interface BackupConfiguration {
  enabled: boolean;
  schedule: string; // cron expression
  destination: string;
  retention: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  compression: boolean;
  encryption: boolean;
}

export interface RestoreOptions {
  backupId: string;
  selective: boolean;
  components?: string[];
  overwrite: boolean;
  validateIntegrity: boolean;
}

export interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  checks: HealthCheckResult[];
  uptime: number;
  version: string;
}

export interface HealthCheckResult {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  duration: number;
  message?: string;
  details?: Record<string, any>;
}

export interface CacheConfiguration {
  enabled: boolean;
  maxSize: number;
  ttl: number;
  strategy: 'lru' | 'lfu' | 'fifo';
  persistToDisk: boolean;
  compressionEnabled: boolean;
}

export interface QueueConfiguration {
  maxSize: number;
  concurrency: number;
  retryAttempts: number;
  retryDelay: number;
  deadLetterQueue: boolean;
  priorityLevels: number;
}

// Utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type EventHandler<T = any> = (event: T) => void | Promise<void>;

export type AsyncFunction<T = any, R = any> = (...args: T[]) => Promise<R>;

export type Callback<T = any> = (error: Error | null, result?: T) => void;

