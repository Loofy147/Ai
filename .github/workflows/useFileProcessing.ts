import { useState, useCallback, useRef } from 'react';
import { FileProcessingState, ProcessingFile, ProcessedFile, FileMetadata } from '../types';

interface FileConfig {
  maxFileSize?: number;
  supportedExtensions?: string[];
  processingQueueSize?: number;
}

interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

interface ProcessingOptions {
  extractMetadata?: boolean;
  performContentAnalysis?: boolean;
  generateSemanticTags?: boolean;
  enableSecurityScanning?: boolean;
}

export const useFileProcessing = (config: FileConfig = {}) => {
  const [fileProcessing, setFileProcessing] = useState<FileProcessingState>({
    queue: [],
    processed: [],
    categories: {
      code: { count: 0, types: ['tsx', 'ts', 'jsx', 'js', 'py', 'cpp', 'html', 'css'], totalSize: 0, lastUpdated: new Date() },
      documents: { count: 0, types: ['md', 'pdf', 'docx', 'txt', 'rtf'], totalSize: 0, lastUpdated: new Date() },
      data: { count: 0, types: ['json', 'csv', 'xml', 'yaml', 'sql'], totalSize: 0, lastUpdated: new Date() },
      multimedia: { count: 0, types: ['png', 'jpg', 'gif', 'mp4', 'wav', 'mp3'], totalSize: 0, lastUpdated: new Date() },
      archives: { count: 0, types: ['zip', 'tar', 'gz', 'rar'], totalSize: 0, lastUpdated: new Date() },
      executables: { count: 0, types: ['exe', 'dll', 'so', 'dylib'], totalSize: 0, lastUpdated: new Date() }
    },
    locations: new Map(),
    encoding: new Map()
  });

  const processingRateRef = useRef(1.0);
  const isProcessingRef = useRef(false);

  // File validation with comprehensive checks
  const validateFile = useCallback(async (file: File): Promise<FileValidationResult> => {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Size validation
    const maxSize = config.maxFileSize || 50 * 1024 * 1024; // 50MB default
    if (file.size > maxSize) {
      errors.push(`File size (${formatFileSize(file.size)}) exceeds maximum allowed size (${formatFileSize(maxSize)})`);
    }
    
    // Extension validation
    const extension = getFileExtension(file.name);
    const supportedExtensions = config.supportedExtensions || [
      'tsx', 'ts', 'jsx', 'js', 'py', 'cpp', 'html', 'css', 'md', 'pdf', 
      'json', 'csv', 'xml', 'yaml', 'png', 'jpg', 'mp4', 'wav'
    ];
    
    if (!supportedExtensions.includes(extension)) {
      warnings.push(`File extension '${extension}' is not in the supported list`);
    }
    
    // Security checks
    const dangerousExtensions = ['exe', 'bat', 'cmd', 'scr', 'vbs', 'js', 'jar'];
    if (dangerousExtensions.includes(extension)) {
      warnings.push(`File type '${extension}' may pose security risks`);
    }
    
    // MIME type validation
    if (file.type && !isValidMimeType(file.type, extension)) {
      warnings.push(`MIME type '${file.type}' doesn't match file extension '${extension}'`);
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }, [config]);

  // Add file to processing queue
  const addFileToQueue = useCallback(async (file: ProcessingFile) => {
    setFileProcessing(prev => {
      const queueSize = config.processingQueueSize || 100;
      if (prev.queue.length >= queueSize) {
        console.warn('Processing queue is full, removing oldest item');
        return {
          ...prev,
          queue: [...prev.queue.slice(1), file]
        };
      }
      
      return {
        ...prev,
        queue: [...prev.queue, file]
      };
    });
  }, [config]);

  // Process next file in queue
  const processNextFile = useCallback(async (): Promise<ProcessedFile | null> => {
    if (isProcessingRef.current) return null;
    
    const nextFile = fileProcessing.queue[0];
    if (!nextFile) return null;
    
    isProcessingRef.current = true;
    
    try {
      // Update file status to processing
      setFileProcessing(prev => ({
        ...prev,
        queue: prev.queue.map(f => 
          f.id === nextFile.id ? { ...f, status: 'processing' } : f
        )
      }));
      
      // Simulate processing delay based on file size and processing rate
      const processingTime = Math.min(5000, nextFile.size / 1000 / processingRateRef.current);
      await new Promise(resolve => setTimeout(resolve, processingTime));
      
      // Create processed file result
      const processedFile: ProcessedFile = {
        ...nextFile,
        status: 'completed',
        processedAt: new Date(),
        metadata: await generateFileMetadata(nextFile),
        content: await extractFileContent(nextFile)
      };
      
      // Update state
      setFileProcessing(prev => {
        const newState = {
          ...prev,
          queue: prev.queue.filter(f => f.id !== nextFile.id),
          processed: [...prev.processed, processedFile]
        };
        
        // Update category statistics
        const category = determineFileCategory(nextFile.type);
        if (category && newState.categories[category]) {
          newState.categories[category].count++;
          newState.categories[category].totalSize += nextFile.size;
          newState.categories[category].lastUpdated = new Date();
        }
        
        return newState;
      });
      
      return processedFile;
      
    } catch (error) {
      console.error('File processing failed:', error);
      
      // Update file status to error
      setFileProcessing(prev => ({
        ...prev,
        queue: prev.queue.map(f => 
          f.id === nextFile.id 
            ? { ...f, status: 'error' } 
            : f
        )
      }));
      
      return null;
    } finally {
      isProcessingRef.current = false;
    }
  }, [fileProcessing.queue]);

  // Generate comprehensive file metadata
  const generateFileMetadata = async (file: ProcessingFile): Promise<FileMetadata> => {
    const now = new Date();
    
    return {
      size: file.size,
      createdAt: now, // In browser context, we can't get actual creation time
      modifiedAt: now,
      encoding: detectEncoding(file.name),
      checksum: await calculateChecksum(file.name), // Simplified checksum
      contentType: file.type,
      extractedText: await extractTextContent(file),
      semanticTags: await generateSemanticTags(file)
    };
  };

  // Extract text content from files
  const extractTextContent = async (file: ProcessingFile): Promise<string | undefined> => {
    const extension = getFileExtension(file.name);
    
    // For text-based files, we would normally read the content
    // In this simulation, we return placeholder text
    const textExtensions = ['txt', 'md', 'js', 'ts', 'tsx', 'jsx', 'py', 'html', 'css', 'json', 'xml', 'yaml'];
    
    if (textExtensions.includes(extension)) {
      return `Extracted text content from ${file.name}. This would contain the actual file content in a real implementation.`;
    }
    
    return undefined;
  };

  // Generate semantic tags based on file content and metadata
  const generateSemanticTags = async (file: ProcessingFile): Promise<string[]> => {
    const tags: string[] = [];
    const extension = getFileExtension(file.name);
    const fileName = file.name.toLowerCase();
    
    // File type tags
    const category = determineFileCategory(file.type);
    if (category) {
      tags.push(category);
    }
    
    // Extension-specific tags
    tags.push(extension);
    
    // Size-based tags
    if (file.size < 1024) tags.push('small');
    else if (file.size < 1024 * 1024) tags.push('medium');
    else tags.push('large');
    
    // Content-based tags (simplified heuristics)
    if (fileName.includes('test')) tags.push('testing');
    if (fileName.includes('config')) tags.push('configuration');
    if (fileName.includes('api')) tags.push('api');
    if (fileName.includes('component')) tags.push('component');
    if (fileName.includes('service')) tags.push('service');
    if (fileName.includes('util')) tags.push('utility');
    if (fileName.includes('doc')) tags.push('documentation');
    
    // Programming language specific tags
    const codeExtensions = ['js', 'ts', 'tsx', 'jsx', 'py', 'cpp', 'java', 'go', 'rs'];
    if (codeExtensions.includes(extension)) {
      tags.push('source-code', 'programming');
    }
    
    return tags;
  };

  // Extract file content for processing
  const extractFileContent = async (file: ProcessingFile): Promise<any> => {
    // In a real implementation, this would read and parse the actual file content
    // For this simulation, we return structured metadata
    return {
      fileName: file.name,
      fileType: file.type,
      size: file.size,
      extension: getFileExtension(file.name),
      category: determineFileCategory(file.type),
      processedAt: new Date().toISOString()
    };
  };

  // Utility functions
  const getFileExtension = (fileName: string): string => {
    return fileName.split('.').pop()?.toLowerCase() || '';
  };

  const formatFileSize = (bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const isValidMimeType = (mimeType: string, extension: string): boolean => {
    const mimeMap: Record<string, string[]> = {
      'text/plain': ['txt', 'md'],
      'application/json': ['json'],
      'text/html': ['html', 'htm'],
      'text/css': ['css'],
      'application/javascript': ['js'],
      'image/png': ['png'],
      'image/jpeg': ['jpg', 'jpeg'],
      'application/pdf': ['pdf']
    };
    
    return mimeMap[mimeType]?.includes(extension) || false;
  };

  const detectEncoding = (fileName: string): string => {
    // Simplified encoding detection based on file extension
    const extension = getFileExtension(fileName);
    const textExtensions = ['txt', 'md', 'js', 'ts', 'tsx', 'jsx', 'html', 'css', 'json', 'xml'];
    
    return textExtensions.includes(extension) ? 'utf-8' : 'binary';
  };

  const calculateChecksum = async (fileName: string): Promise<string> => {
    // Simplified checksum calculation (in real implementation, would hash file content)
    return `checksum_${fileName.length}_${Date.now()}`;
  };

  const determineFileCategory = (mimeType: string): keyof typeof fileProcessing.categories | null => {
    if (mimeType.startsWith('text/') || mimeType.includes('javascript') || mimeType.includes('typescript')) {
      return 'code';
    }
    if (mimeType.includes('document') || mimeType.includes('pdf') || mimeType.includes('text')) {
      return 'documents';
    }
    if (mimeType.includes('json') || mimeType.includes('xml') || mimeType.includes('csv')) {
      return 'data';
    }
    if (mimeType.startsWith('image/') || mimeType.startsWith('video/') || mimeType.startsWith('audio/')) {
      return 'multimedia';
    }
    if (mimeType.includes('zip') || mimeType.includes('tar') || mimeType.includes('compressed')) {
      return 'archives';
    }
    if (mimeType.includes('executable') || mimeType.includes('application/x-')) {
      return 'executables';
    }
    
    return null;
  };

  // Get processing statistics
  const getProcessingStats = useCallback(() => {
    const totalProcessed = fileProcessing.processed.length;
    const totalSize = fileProcessing.processed.reduce((sum, file) => sum + file.size, 0);
    const averageProcessingTime = totalProcessed > 0 
      ? fileProcessing.processed.reduce((sum, file) => {
          const processingTime = file.processedAt.getTime() - new Date(file.processedAt).getTime();
          return sum + processingTime;
        }, 0) / totalProcessed
      : 0;
    
    return {
      queueLength: fileProcessing.queue.length,
      totalProcessed,
      totalSize: formatFileSize(totalSize),
      averageProcessingTime,
      categories: fileProcessing.categories,
      processingRate: processingRateRef.current
    };
  }, [fileProcessing]);

  // Clear processed files
  const clearProcessedFiles = useCallback(() => {
    setFileProcessing(prev => ({
      ...prev,
      processed: []
    }));
  }, []);

  // Adjust processing rate for performance optimization
  const adjustProcessingRate = useCallback((rate: number) => {
    processingRateRef.current = Math.max(0.1, Math.min(2.0, rate));
  }, []);

  return {
    fileProcessing,
    validateFile,
    addFileToQueue,
    processNextFile,
    getProcessingStats,
    clearProcessedFiles,
    adjustProcessingRate
  };
};

