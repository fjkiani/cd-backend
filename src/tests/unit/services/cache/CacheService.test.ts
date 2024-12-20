import { CacheService } from '../../../../services/cache/CacheService';
import { ILogger } from '../../../../types/logger';
import { Redis as IORedis } from 'ioredis';

// Create a mock instance
const mockRedisInstance = {
  get: jest.fn(),
  set: jest.fn(),
  setex: jest.fn()
};

// Mock the module with named export
jest.mock('ioredis', () => ({
  Redis: jest.fn().mockImplementation(() => mockRedisInstance)
}));

describe('CacheService', () => {
  let cacheService: CacheService;
  let mockLogger: ILogger;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    cacheService = new CacheService({ redisUrl: 'redis://localhost:6379' }, mockLogger);
  });

  describe('get', () => {
    it('should retrieve cached value successfully', async () => {
      const testData = { key: 'value' };
      mockRedisInstance.get.mockResolvedValue(JSON.stringify(testData));

      const result = await cacheService.get('test-key');

      expect(result).toEqual(testData);
      expect(mockLogger.info).toHaveBeenCalledWith('Cache hit for key: test-key');
      expect(mockRedisInstance.get).toHaveBeenCalledWith('test-key');
    });

    it('should return null for non-existent key', async () => {
      mockRedisInstance.get.mockResolvedValue(null);

      const result = await cacheService.get('non-existent');

      expect(result).toBeNull();
      expect(mockLogger.info).toHaveBeenCalledWith('Cache miss for key: non-existent');
      expect(mockRedisInstance.get).toHaveBeenCalledWith('non-existent');
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedisInstance.get.mockRejectedValue(new Error('Redis connection failed'));

      const result = await cacheService.get('test-key');

      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith('Cache get error:', expect.any(Error));
    });
  });

  describe('set', () => {
    it('should set value with TTL', async () => {
      mockRedisInstance.setex.mockResolvedValue('OK');
      const testKey = 'test-key';
      const testValue = { data: 'test' };
      const ttl = 3600;

      await cacheService.set(testKey, testValue, ttl);

      expect(mockRedisInstance.setex).toHaveBeenCalledWith(
        testKey, 
        ttl, 
        JSON.stringify(testValue)
      );
      expect(mockLogger.info).toHaveBeenCalledWith(`Cache set with TTL for key: ${testKey}`);
    });

    it('should set value without TTL', async () => {
      mockRedisInstance.set.mockResolvedValue('OK');
      const testKey = 'test-key';
      const testValue = { data: 'test' };

      await cacheService.set(testKey, testValue);

      expect(mockRedisInstance.set).toHaveBeenCalledWith(
        testKey, 
        JSON.stringify(testValue)
      );
      expect(mockLogger.info).toHaveBeenCalledWith(`Cache set for key: ${testKey}`);
    });
  });
});