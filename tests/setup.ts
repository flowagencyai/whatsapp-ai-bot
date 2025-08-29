import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Mock console methods for cleaner test output
const originalConsole = { ...console };

beforeAll(() => {
  // Mock console methods to reduce noise in tests
  console.log = jest.fn();
  console.info = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  // Restore console methods
  Object.assign(console, originalConsole);
});

// Global test timeout
jest.setTimeout(30000);

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';
process.env.OPENAI_API_KEY = 'sk-test-key-mock';
process.env.GROQ_API_KEY = 'gsk_test-key-mock';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.BOT_NAME = 'Test Bot';