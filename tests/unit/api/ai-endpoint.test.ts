import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST, GET } from '@/app/api/ai/[type]/route';

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      upsert: vi.fn().mockResolvedValue({ error: null }),
    })),
  })),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('AI API Endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.OPENAI_API_KEY;
  });

  const createMockRequest = (body: any) => {
    return {
      json: vi.fn().mockResolvedValue(body),
    } as unknown as NextRequest;
  };

  const mockOnboardingData = {
    name: 'Sarah Johnson',
    username: 'sarahfitness',
    additionalInfo: 'NASM certified trainer specializing in strength training',
    headline: 'Certified Personal Trainer',
    subheadline: 'Transforming lives through fitness',
    bio: '',
    servicesCount: 1,
    services: [{ title: '', description: '' }],
    highlightsCount: 1,
    highlights: [{ title: '', description: '' }],
    wantsContactForm: false,
    contactEmail: '',
    wantsCTAButton: false,
    ctaText: '',
    ctaUrl: ''
  };

  describe('POST /api/ai/[type]', () => {
    it('should return 400 for invalid type', async () => {
      const request = createMockRequest({
        userId: 'user-123',
        onboarding: mockOnboardingData,
      });

      const response = await POST(request, { params: { type: 'invalid' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid type');
    });

    it('should return 400 for missing required fields', async () => {
      const request = createMockRequest({
        onboarding: mockOnboardingData,
        // Missing userId
      });

      const response = await POST(request, { params: { type: 'bio' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing required fields');
    });

    it('should return mock suggestion for bio when OpenAI API key is missing', async () => {
      const request = createMockRequest({
        userId: 'user-123',
        onboarding: mockOnboardingData,
      });

      const response = await POST(request, { params: { type: 'bio' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.suggestion).toBeDefined();
      expect(typeof data.suggestion).toBe('string');
      expect(data.suggestion).toContain('Certified Strength Coach');
    });

    it('should return mock suggestion for services when OpenAI API key is missing', async () => {
      const request = createMockRequest({
        userId: 'user-123',
        onboarding: mockOnboardingData,
      });

      const response = await POST(request, { params: { type: 'services' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.suggestion).toBeDefined();
      expect(Array.isArray(data.suggestion)).toBe(true);
      expect(data.suggestion).toHaveLength(3);
      expect(data.suggestion[0]).toHaveProperty('title');
      expect(data.suggestion[0]).toHaveProperty('description');
    });

    it('should return mock suggestion for highlights when OpenAI API key is missing', async () => {
      const request = createMockRequest({
        userId: 'user-123',
        onboarding: mockOnboardingData,
      });

      const response = await POST(request, { params: { type: 'highlights' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.suggestion).toBeDefined();
      expect(Array.isArray(data.suggestion)).toBe(true);
      expect(data.suggestion).toHaveLength(3);
      expect(data.suggestion[0]).toHaveProperty('title');
      expect(data.suggestion[0]).toHaveProperty('description');
    });

    it('should skip database save for DEV_ user', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const request = createMockRequest({
        userId: 'DEV_user-123',
        onboarding: mockOnboardingData,
      });

      const response = await POST(request, { params: { type: 'bio' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.suggestion).toBeDefined();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('DEV MODE: Skipping database save')
      );
      
      consoleSpy.mockRestore();
    });

    it('should use OpenAI API when key is available', async () => {
      process.env.OPENAI_API_KEY = 'test-api-key';
      
      const mockOpenAIResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          choices: [{
            message: {
              content: 'AI generated bio content'
            }
          }]
        })
      };
      
      mockFetch.mockResolvedValue(mockOpenAIResponse);

      const request = createMockRequest({
        userId: 'user-123',
        onboarding: mockOnboardingData,
      });

      const response = await POST(request, { params: { type: 'bio' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.suggestion).toBe('AI generated bio content');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-api-key',
          }),
        })
      );
    });

    it('should fallback to mock when OpenAI API fails', async () => {
      process.env.OPENAI_API_KEY = 'test-api-key';
      
      mockFetch.mockRejectedValue(new Error('API Error'));

      const request = createMockRequest({
        userId: 'user-123',
        onboarding: mockOnboardingData,
      });

      const response = await POST(request, { params: { type: 'bio' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.suggestion).toBeDefined();
      expect(data.suggestion).toContain('Certified Strength Coach');
    });

    it('should handle invalid JSON in request body', async () => {
      const request = {
        json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
      } as unknown as NextRequest;

      const response = await POST(request, { params: { type: 'bio' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid JSON');
    });
  });

  describe('Non-POST methods', () => {
    it('should return 405 for GET requests', async () => {
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(405);
      expect(data.error).toBe('Method not allowed');
    });
  });

  describe('Mock suggestions content', () => {
    it('should include fitness-specific terminology in bio suggestions', async () => {
      const request = createMockRequest({
        userId: 'user-123',
        onboarding: mockOnboardingData,
      });

      const response = await POST(request, { params: { type: 'bio' } });
      const data = await response.json();

      expect(data.suggestion).toMatch(/I'm|I am|certified|strength|fitness|coach|training|experience/i);
    });

    it('should return proper service structure', async () => {
      const request = createMockRequest({
        userId: 'user-123',
        onboarding: mockOnboardingData,
      });

      const response = await POST(request, { params: { type: 'services' } });
      const data = await response.json();

      const services = data.suggestion;
      expect(services).toHaveLength(3);
      
      services.forEach((service: any) => {
        expect(service).toHaveProperty('title');
        expect(service).toHaveProperty('description');
        expect(service.title).toMatch(/training|nutrition|fitness|group/i);
        expect(service.description.length).toBeGreaterThan(50);
      });
    });

    it('should return proper highlights structure', async () => {
      const request = createMockRequest({
        userId: 'user-123',
        onboarding: mockOnboardingData,
      });

      const response = await POST(request, { params: { type: 'highlights' } });
      const data = await response.json();

      const highlights = data.suggestion;
      expect(highlights).toHaveLength(3);
      
      highlights.forEach((highlight: any) => {
        expect(highlight).toHaveProperty('title');
        expect(highlight).toHaveProperty('description');
        expect(highlight.title).toMatch(/certified|nasm|specialist|transformations/i);
        expect(highlight.description.length).toBeGreaterThan(50);
      });
    });
  });
});