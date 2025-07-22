import { vi } from 'vitest'
import { DashboardData, Service, Highlight, Testimonial, LandingPage, UserProStatus } from '@/types/dashboard'

/**
 * Mock DashboardServiceClient for testing
 */
export function createMockDashboardService() {
  return {
    getDashboardData: vi.fn(),
    createService: vi.fn(),
    updateService: vi.fn(),
    deleteService: vi.fn(),
    updateServicesOrder: vi.fn(),
    createHighlight: vi.fn(),
    updateHighlight: vi.fn(),
    deleteHighlight: vi.fn(),
    createTestimonial: vi.fn(),
    updateTestimonial: vi.fn(),
    deleteTestimonial: vi.fn(),
    uploadImage: vi.fn(),
    updateLandingPage: vi.fn()
  }
}

/**
 * Generate mock dashboard data for testing
 */
export function generateMockDashboardData(overrides: Partial<DashboardData> = {}): DashboardData {
  const baseTimestamp = '2024-01-01T00:00:00.000Z'
  
  const mockLandingPage: LandingPage = {
    id: 'landing-page-1',
    user_id: 'user-1',
    username: 'testuser',
    headline: 'Test Headline',
    subheadline: 'Test Subheadline',
    cta_text: 'Get Started',
    cta_url: 'https://example.com',
    bio: 'Test bio description',
    profile_image_url: null,
    theme_side: 'left',
    name: 'Test User',
    instagram_url: null,
    youtube_url: null,
    tiktok_url: null,
    contact_email: 'test@example.com',
    show_contact_form: true,
    onboarding_data: {},
    ai_uses: 0,
    created_at: baseTimestamp
  }

  const mockServices: Service[] = [
    {
      id: 'service-1',
      landing_page_id: 'landing-page-1',
      title: 'Test Service 1',
      description: 'Description for test service 1',
      price: '$99',
      button_text: 'Learn More',
      button_url: 'https://example.com/service1',
      image_urls: ['https://example.com/image1.jpg'],
      youtube_url: null,
      ai_uses: 0
    },
    {
      id: 'service-2',
      landing_page_id: 'landing-page-1',
      title: 'Test Service 2',
      description: 'Description for test service 2',
      price: '$199',
      button_text: 'Book Now',
      button_url: 'https://example.com/service2',
      image_urls: [],
      youtube_url: 'https://youtube.com/watch?v=test',
      ai_uses: 0
    }
  ]

  const mockHighlights: Highlight[] = [
    {
      id: 'highlight-1',
      landing_page_id: 'landing-page-1',
      header: 'Test Highlight 1',
      content: 'Content for test highlight 1',
      ai_uses: 0,
      created_at: baseTimestamp,
      updated_at: baseTimestamp
    },
    {
      id: 'highlight-2',
      landing_page_id: 'landing-page-1',
      header: 'Test Highlight 2',
      content: 'Content for test highlight 2',
      ai_uses: 0,
      created_at: baseTimestamp,
      updated_at: baseTimestamp
    }
  ]

  const mockTestimonials: Testimonial[] = [
    {
      id: 'testimonial-1',
      landing_page_id: 'landing-page-1',
      quote: 'Great service!',
      author_name: 'John Doe',
      description: 'CEO at Example Corp',
      image_urls: [],
      youtube_url: null
    }
  ]

  const mockUserProStatus: UserProStatus = {
    user_id: 'user-1',
    is_pro: false,
    updated_at: baseTimestamp
  }

  return {
    landingPage: mockLandingPage,
    services: mockServices,
    highlights: mockHighlights,
    testimonials: mockTestimonials,
    userProStatus: mockUserProStatus,
    ...overrides
  }
}

/**
 * Generate mock service data
 */
export function generateMockService(overrides: Partial<Service> = {}): Service {
  const id = `service-${Date.now()}`
  
  return {
    id,
    landing_page_id: 'landing-page-1',
    title: `Test Service ${id}`,
    description: `Description for ${id}`,
    price: '$99',
    button_text: 'Learn More',
    button_url: 'https://example.com',
    image_urls: [],
    youtube_url: null,
    ai_uses: 0,
    ...overrides
  }
}

/**
 * Generate mock services for reordering tests
 */
export function generateMockServicesForReordering(count: number = 3): Service[] {
  return Array.from({ length: count }, (_, index) => 
    generateMockService({
      id: `service-${index + 1}`,
      title: `Service ${index + 1}`,
      description: `Description ${index + 1}`
    })
  )
}

/**
 * Mock the DashboardDataContext provider for testing
 */
export function createMockDashboardProvider(data: DashboardData) {
  return function MockDashboardProvider({ children }: { children: React.ReactNode }) {
    const mockContext = {
      data,
      updateData: vi.fn()
    }
    
    return (
      <div data-testid="mock-dashboard-provider">
        {children}
      </div>
    )
  }
}

/**
 * Mock the drag and drop functionality
 */
export function mockDragAndDrop() {
  // Mock DndContext and related hooks
  vi.mock('@dnd-kit/core', () => ({
    DndContext: ({ children, onDragEnd }: any) => {
      // Simulate drag end by calling the handler with mock event
      const mockDragEnd = (activeId: string, overId: string) => {
        if (onDragEnd) {
          onDragEnd({
            active: { id: activeId },
            over: { id: overId }
          })
        }
      }
      
      return (
        <div data-testid="dnd-context" data-drag-handler={mockDragEnd}>
          {children}
        </div>
      )
    },
    closestCenter: vi.fn(),
    KeyboardSensor: vi.fn(),
    PointerSensor: vi.fn(),
    useSensor: vi.fn(),
    useSensors: vi.fn(() => [])
  }))
  
  vi.mock('@dnd-kit/sortable', () => ({
    SortableContext: ({ children }: any) => (
      <div data-testid="sortable-context">{children}</div>
    ),
    sortableKeyboardCoordinates: vi.fn(),
    verticalListSortingStrategy: {},
    useSortable: vi.fn(() => ({
      attributes: {},
      listeners: {},
      setNodeRef: vi.fn(),
      transform: null,
      transition: null,
      isDragging: false
    }))
  }))
  
  vi.mock('@dnd-kit/utilities', () => ({
    CSS: {
      Transform: {
        toString: vi.fn(() => '')
      }
    }
  }))
}

/**
 * Create mock form handlers for testing
 */
export function createMockFormHandlers() {
  return {
    register: vi.fn((name: string) => ({
      name,
      onChange: vi.fn(),
      onBlur: vi.fn(),
      ref: vi.fn()
    })),
    handleSubmit: vi.fn((fn) => (e: Event) => {
      e.preventDefault()
      fn({})
    }),
    formState: {
      errors: {},
      isSubmitting: false,
      isValid: true
    },
    reset: vi.fn(),
    setValue: vi.fn(),
    getValues: vi.fn(() => ({}))
  }
}

/**
 * Test utilities for service operations
 */
export class ServiceTestUtils {
  constructor(private mockService: ReturnType<typeof createMockDashboardService>) {}

  /**
   * Simulate successful service creation
   */
  mockSuccessfulCreate(newService: Service) {
    this.mockService.createService.mockResolvedValue(newService)
  }

  /**
   * Simulate failed service creation
   */
  mockFailedCreate(error: string) {
    this.mockService.createService.mockRejectedValue(new Error(error))
  }

  /**
   * Simulate successful service update
   */
  mockSuccessfulUpdate(updatedService: Service) {
    this.mockService.updateService.mockResolvedValue(updatedService)
  }

  /**
   * Simulate successful service deletion
   */
  mockSuccessfulDelete() {
    this.mockService.deleteService.mockResolvedValue(undefined)
  }

  /**
   * Simulate successful reordering
   */
  mockSuccessfulReorder() {
    this.mockService.updateServicesOrder.mockResolvedValue(undefined)
  }

  /**
   * Simulate failed reordering
   */
  mockFailedReorder(error: string) {
    this.mockService.updateServicesOrder.mockRejectedValue(new Error(error))
  }

  /**
   * Get call arguments from mock functions
   */
  getCreateCallArgs() {
    return this.mockService.createService.mock.calls
  }

  getUpdateCallArgs() {
    return this.mockService.updateService.mock.calls
  }

  getDeleteCallArgs() {
    return this.mockService.deleteService.mock.calls
  }

  getReorderCallArgs() {
    return this.mockService.updateServicesOrder.mock.calls
  }
}

/**
 * Create test props for ServicesSection component
 */
export function createServicesSectionTestProps(overrides: any = {}) {
  const defaultData = generateMockDashboardData()
  
  return {
    services: defaultData.services,
    landingPageId: defaultData.landingPage?.id || 'landing-page-1',
    onUpdate: vi.fn(),
    ...overrides
  }
}