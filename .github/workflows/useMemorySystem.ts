import { useState, useEffect, useCallback } from 'react';
import { MemorySystemState, MemoryItem } from '../types';

interface MemoryConfig {
  compressionRatio?: number;
  retentionThreshold?: number;
  cleanupInterval?: number;
}

interface MemoryRetrievalOptions {
  limit?: number;
  threshold?: number;
  includeArchived?: boolean;
  sortBy?: 'relevance' | 'recency' | 'importance';
}

export const useMemorySystem = (config: MemoryConfig = {}) => {
  const [memorySystem, setMemorySystem] = useState<MemorySystemState>({
    shortTerm: [],
    longTerm: [],
    archive: [],
    compressionRatio: config.compressionRatio || 0.7,
    retentionScore: config.retentionThreshold || 0.8,
    cyclicCleanup: 0
  });

  // Advanced memory storage with semantic analysis
  const storeMemory = useCallback(async (item: MemoryItem) => {
    setMemorySystem(prev => {
      const newState = { ...prev };
      
      // Check for duplicates using content similarity
      const isDuplicate = prev.shortTerm.some(existing => 
        calculateSimilarity(existing.content, item.content) > 0.9
      );
      
      if (!isDuplicate) {
        // Add to short-term memory
        newState.shortTerm = [...prev.shortTerm, item];
        
        // Trigger compression if short-term memory is full
        if (newState.shortTerm.length > 100) {
          compressMemoriesInternal(newState);
        }
      }
      
      return newState;
    });
  }, []);

  // Intelligent memory retrieval with vector similarity
  const retrieveMemories = useCallback(async (
    query: string, 
    options: MemoryRetrievalOptions = {}
  ): Promise<MemoryItem[]> => {
    const { limit = 10, threshold = 0.7, includeArchived = false, sortBy = 'relevance' } = options;
    
    const allMemories = [
      ...memorySystem.shortTerm,
      ...memorySystem.longTerm,
      ...(includeArchived ? memorySystem.archive : [])
    ];

    // Calculate relevance scores
    const scoredMemories = allMemories.map(memory => ({
      ...memory,
      relevanceScore: calculateRelevance(query, memory)
    })).filter(memory => memory.relevanceScore >= threshold);

    // Sort based on criteria
    scoredMemories.sort((a, b) => {
      switch (sortBy) {
        case 'recency':
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        case 'importance':
          return b.importance - a.importance;
        case 'relevance':
        default:
          return b.relevanceScore - a.relevanceScore;
      }
    });

    // Update access counts
    const retrievedIds = scoredMemories.slice(0, limit).map(m => m.id);
    setMemorySystem(prev => ({
      ...prev,
      shortTerm: prev.shortTerm.map(m => 
        retrievedIds.includes(m.id) ? { ...m, accessCount: m.accessCount + 1 } : m
      ),
      longTerm: prev.longTerm.map(m => 
        retrievedIds.includes(m.id) ? { ...m, accessCount: m.accessCount + 1 } : m
      )
    }));

    return scoredMemories.slice(0, limit);
  }, [memorySystem]);

  // Advanced compression algorithm
  const compressMemories = useCallback(async () => {
    setMemorySystem(prev => {
      const newState = { ...prev };
      compressMemoriesInternal(newState);
      return newState;
    });
  }, []);

  // Internal compression logic
  const compressMemoriesInternal = (state: MemorySystemState) => {
    const now = new Date();
    const compressionThreshold = 50; // Compress when short-term has more than 50 items
    
    if (state.shortTerm.length > compressionThreshold) {
      // Calculate retention scores for each memory
      const scoredMemories = state.shortTerm.map(memory => ({
        ...memory,
        retentionScore: calculateRetentionScore(memory, now)
      }));

      // Sort by retention score
      scoredMemories.sort((a, b) => b.retentionScore - a.retentionScore);

      // Keep top memories in short-term
      const keepInShortTerm = Math.floor(compressionThreshold * 0.7);
      state.shortTerm = scoredMemories.slice(0, keepInShortTerm);

      // Move medium-importance memories to long-term
      const moveToLongTerm = scoredMemories.slice(keepInShortTerm, keepInShortTerm + 20);
      state.longTerm = [...state.longTerm, ...moveToLongTerm];

      // Archive or discard low-importance memories
      const toArchive = scoredMemories.slice(keepInShortTerm + 20);
      const archiveWorthy = toArchive.filter(m => m.retentionScore > 0.3);
      state.archive = [...state.archive, ...archiveWorthy];

      // Update compression ratio
      const totalOriginal = scoredMemories.length;
      const totalKept = state.shortTerm.length + moveToLongTerm.length + archiveWorthy.length;
      state.compressionRatio = totalKept / totalOriginal;
    }

    // Clean up old archive entries
    const archiveRetentionDays = 30;
    const cutoffDate = new Date(now.getTime() - archiveRetentionDays * 24 * 60 * 60 * 1000);
    state.archive = state.archive.filter(memory => 
      new Date(memory.timestamp) > cutoffDate || memory.importance > 0.8
    );

    state.cyclicCleanup++;
  };

  // Calculate content similarity using simple text comparison
  const calculateSimilarity = (content1: any, content2: any): number => {
    const str1 = JSON.stringify(content1).toLowerCase();
    const str2 = JSON.stringify(content2).toLowerCase();
    
    if (str1 === str2) return 1.0;
    
    // Simple Jaccard similarity
    const words1 = new Set(str1.split(/\s+/));
    const words2 = new Set(str2.split(/\s+/));
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  };

  // Calculate relevance score for retrieval
  const calculateRelevance = (query: string, memory: MemoryItem): number => {
    const queryLower = query.toLowerCase();
    const contentStr = JSON.stringify(memory.content).toLowerCase();
    const tagsStr = memory.tags.join(' ').toLowerCase();
    
    let score = 0;
    
    // Exact matches get high scores
    if (contentStr.includes(queryLower)) {
      score += 0.8;
    }
    
    // Tag matches
    if (tagsStr.includes(queryLower)) {
      score += 0.6;
    }
    
    // Word overlap
    const queryWords = queryLower.split(/\s+/);
    const contentWords = contentStr.split(/\s+/);
    const overlap = queryWords.filter(word => contentWords.includes(word)).length;
    score += (overlap / queryWords.length) * 0.4;
    
    // Boost by importance and access count
    score *= (1 + memory.importance * 0.2);
    score *= (1 + Math.log(memory.accessCount + 1) * 0.1);
    
    // Recency boost (newer memories get slight boost)
    const daysSinceCreation = (Date.now() - new Date(memory.timestamp).getTime()) / (1000 * 60 * 60 * 24);
    score *= Math.max(0.5, 1 - daysSinceCreation * 0.01);
    
    return Math.min(1.0, score);
  };

  // Calculate retention score for compression decisions
  const calculateRetentionScore = (memory: MemoryItem, currentTime: Date): number => {
    const ageInDays = (currentTime.getTime() - new Date(memory.timestamp).getTime()) / (1000 * 60 * 60 * 24);
    
    // Base score from importance
    let score = memory.importance;
    
    // Access frequency boost
    score += Math.min(0.3, memory.accessCount * 0.05);
    
    // Recency factor (exponential decay)
    score *= Math.exp(-ageInDays * 0.1);
    
    // Tag-based importance
    const importantTags = ['critical', 'important', 'user-preference', 'system-config'];
    const hasImportantTags = memory.tags.some(tag => importantTags.includes(tag));
    if (hasImportantTags) {
      score *= 1.5;
    }
    
    return Math.min(1.0, score);
  };

  // Get memory system statistics
  const getMemoryStats = useCallback(() => {
    const totalMemories = memorySystem.shortTerm.length + memorySystem.longTerm.length + memorySystem.archive.length;
    const averageImportance = totalMemories > 0 
      ? [...memorySystem.shortTerm, ...memorySystem.longTerm, ...memorySystem.archive]
          .reduce((sum, m) => sum + m.importance, 0) / totalMemories
      : 0;
    
    return {
      totalMemories,
      shortTermCount: memorySystem.shortTerm.length,
      longTermCount: memorySystem.longTerm.length,
      archiveCount: memorySystem.archive.length,
      averageImportance,
      compressionRatio: memorySystem.compressionRatio,
      retentionScore: memorySystem.retentionScore,
      cleanupCycles: memorySystem.cyclicCleanup
    };
  }, [memorySystem]);

  // Periodic cleanup
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      compressMemories();
    }, config.cleanupInterval || 300000); // Default 5 minutes

    return () => clearInterval(cleanupInterval);
  }, [compressMemories, config.cleanupInterval]);

  return {
    memorySystem,
    storeMemory,
    retrieveMemories,
    compressMemories,
    getMemoryStats
  };
};

