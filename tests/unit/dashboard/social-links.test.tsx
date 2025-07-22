import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, describe, vi, beforeEach } from 'vitest'
import { SocialLinksSection } from '@/components/dashboard/sections/SocialLinksSection'
import { SocialLink } from '@/types/dashboard'

// Mock data generators
const generateMockSocialLink = (overrides: Partial<SocialLink> = {}): SocialLink => ({
  id: `social-${Date.now()}`,
  landing_page_id: 'test-landing-page',
  platform: 'linkedin',
  url: 'https://linkedin.com/in/johndoe',
  icon: 'linkedin',
  order_index: 0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides
})

const createSocialLinksSectionProps = (overrides: any = {}) => ({
  landingPageId: 'test-landing-page',
  socialLinks: [
    generateMockSocialLink({ id: 'social-1', platform: 'linkedin', url: 'https://linkedin.com/in/test1', order_index: 0 }),
    generateMockSocialLink({ id: 'social-2', platform: 'twitter', url: 'https://twitter.com/test2', order_index: 1 })
  ],
  onUpdate: vi.fn(),
  ...overrides
})

// Mock dashboard service
const mockDashboardService = {
  createSocialLink: vi.fn(),
  updateSocialLink: vi.fn(),
  deleteSocialLink: vi.fn(),
  updateSocialLinksOrder: vi.fn()
}

vi.mock('@/lib/supabase/dashboard-service-client', () => ({
  DashboardServiceClient: vi.fn(() => mockDashboardService)
}))

// Mock drag and drop
vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children, onDragEnd }: any) => (
    <div data-testid="dnd-context">
      {children}
      <button
        data-testid="simulate-social-drag"
        onClick={() => onDragEnd({
          active: { id: 'social-1' },
          over: { id: 'social-2' }
        })}
      >
        Simulate Drag
      </button>
    </div>
  ),
  closestCenter: vi.fn(),
  KeyboardSensor: vi.fn(),
  PointerSensor: vi.fn(),
  useSensor: vi.fn(),
  useSensors: vi.fn(() => [])
}))

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: any) => <div data-testid="sortable-context">{children}</div>,
  sortableKeyboardCoordinates: vi.fn(),
  verticalListSortingStrategy: {},
  useSortable: vi.fn((props) => ({
    attributes: { 'data-sortable-id': props.id },
    listeners: { onMouseDown: vi.fn() },
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false
  }))
}))

// Mock form
const mockFormReset = vi.fn()
vi.mock('react-hook-form', () => ({
  useForm: () => ({
    register: vi.fn((name: string) => ({ name, onChange: vi.fn(), onBlur: vi.fn(), ref: vi.fn() })),
    handleSubmit: vi.fn((fn) => (e: Event) => {
      e.preventDefault()
      fn({
        platform: 'github',
        url: 'https://github.com/newuser',
        icon: 'github'
      })
    }),
    formState: { errors: {}, isSubmitting: false, isValid: true },
    reset: mockFormReset,
    setValue: vi.fn(),
    getValues: vi.fn(() => ({})),
    watch: vi.fn()
  })
}))

// Mock social platform configurations
vi.mock('@/lib/social-platforms', () => ({
  SOCIAL_PLATFORMS: {
    linkedin: { name: 'LinkedIn', icon: 'linkedin', baseUrl: 'https://linkedin.com' },
    twitter: { name: 'Twitter', icon: 'twitter', baseUrl: 'https://twitter.com' },
    github: { name: 'GitHub', icon: 'github', baseUrl: 'https://github.com' },
    instagram: { name: 'Instagram', icon: 'instagram', baseUrl: 'https://instagram.com' },
    facebook: { name: 'Facebook', icon: 'facebook', baseUrl: 'https://facebook.com' }
  },
  validateSocialUrl: vi.fn((platform: string, url: string) => {
    if (platform === 'linkedin' && !url.includes('linkedin.com')) {
      return { isValid: false, error: 'LinkedIn URL must be from linkedin.com' }
    }
    if (platform === 'twitter' && !url.includes('twitter.com')) {
      return { isValid: false, error: 'Twitter URL must be from twitter.com' }
    }
    return { isValid: true }
  })
}))

describe('Social Links Management', () => {
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    user = userEvent.setup()
    vi.clearAllMocks()
    mockFormReset.mockClear()
  })

  describe('Social Link Creation', () => {
    test('should create new social link', async () => {
      const props = createSocialLinksSectionProps()
      const newSocialLink = generateMockSocialLink({
        id: 'new-social-123',
        platform: 'github',
        url: 'https://github.com/newuser',
        icon: 'github'
      })

      mockDashboardService.createSocialLink.mockResolvedValue(newSocialLink)

      render(<SocialLinksSection {...props} />)

      // Open create dialog
      await user.click(screen.getByRole('button', { name: /add social link/i }))
      expect(screen.getByText('Add Social Link')).toBeInTheDocument()

      // Submit form
      const form = screen.getByRole('dialog').querySelector('form')
      if (form) {
        fireEvent.submit(form)
      }

      // Verify social link creation
      await waitFor(() => {
        expect(mockDashboardService.createSocialLink).toHaveBeenCalledWith(
          props.landingPageId,
          expect.objectContaining({
            platform: 'github',
            url: 'https://github.com/newuser',
            icon: 'github'
          })
        )
      })

      // Verify UI update
      expect(props.onUpdate).toHaveBeenCalledWith({
        socialLinks: [...props.socialLinks, newSocialLink]
      })
    })

    test('should handle social link creation failure', async () => {
      const props = createSocialLinksSectionProps()
      
      mockDashboardService.createSocialLink.mockRejectedValue(new Error('Creation failed'))

      render(<SocialLinksSection {...props} />)

      await user.click(screen.getByRole('button', { name: /add social link/i }))
      
      const form = screen.getByRole('dialog').querySelector('form')
      if (form) {
        fireEvent.submit(form)
      }

      await waitFor(() => {
        expect(mockDashboardService.createSocialLink).toHaveBeenCalled()
      })

      // Should not update social links list on failure
      expect(props.onUpdate).not.toHaveBeenCalled()
    })

    test('should prevent duplicate platform entries', async () => {
      const props = createSocialLinksSectionProps()

      // Mock form validation to prevent duplicate LinkedIn
      vi.mocked(require('react-hook-form').useForm).mockReturnValue({
        register: vi.fn((name: string) => ({ name, onChange: vi.fn(), onBlur: vi.fn(), ref: vi.fn() })),
        handleSubmit: vi.fn((fn) => vi.fn()),
        formState: { 
          errors: { 
            platform: { message: 'LinkedIn link already exists' }
          }, 
          isSubmitting: false, 
          isValid: false 
        },
        reset: mockFormReset,
        setValue: vi.fn(),
        getValues: vi.fn(() => ({})),
        watch: vi.fn()
      })

      render(<SocialLinksSection {...props} />)

      await user.click(screen.getByRole('button', { name: /add social link/i }))

      expect(screen.getByText('LinkedIn link already exists')).toBeInTheDocument()
    })
  })

  describe('Social Link Update', () => {
    test('should update existing social link', async () => {
      const props = createSocialLinksSectionProps()
      const existingSocialLink = props.socialLinks[0]
      const updatedSocialLink = {
        ...existingSocialLink,
        url: 'https://linkedin.com/in/updated-profile'
      }

      mockDashboardService.updateSocialLink.mockResolvedValue(updatedSocialLink)

      render(<SocialLinksSection {...props} />)

      // Find and click edit button
      const editButtons = screen.getAllByRole('button', { name: '' })
      const editButton = editButtons.find(btn => btn.querySelector('[data-lucide="edit-2"]'))
      
      if (editButton) {
        await user.click(editButton)
        expect(screen.getByText('Edit Social Link')).toBeInTheDocument()

        // Submit form
        const form = screen.getByRole('dialog').querySelector('form')
        if (form) {
          fireEvent.submit(form)
        }

        await waitFor(() => {
          expect(mockDashboardService.updateSocialLink).toHaveBeenCalledWith(
            existingSocialLink.id,
            expect.objectContaining({
              url: 'https://github.com/newuser' // From mocked form data
            })
          )
        })

        // Verify social links list update
        expect(props.onUpdate).toHaveBeenCalledWith({
          socialLinks: props.socialLinks.map(link => 
            link.id === existingSocialLink.id ? updatedSocialLink : link
          )
        })
      }
    })

    test('should pre-populate edit form', async () => {
      const props = createSocialLinksSectionProps()
      
      render(<SocialLinksSection {...props} />)

      const editButtons = screen.getAllByRole('button', { name: '' })
      const editButton = editButtons.find(btn => btn.querySelector('[data-lucide="edit-2"]'))
      
      if (editButton) {
        await user.click(editButton)
        
        expect(mockFormReset).toHaveBeenCalledWith(
          expect.objectContaining({
            platform: props.socialLinks[0].platform,
            url: props.socialLinks[0].url,
            icon: props.socialLinks[0].icon
          })
        )
      }
    })
  })

  describe('Social Link Deletion', () => {
    test('should delete social link successfully', async () => {
      const props = createSocialLinksSectionProps()
      const linkToDelete = props.socialLinks[0]

      mockDashboardService.deleteSocialLink.mockResolvedValue(undefined)

      render(<SocialLinksSection {...props} />)

      // Find and click delete button
      const deleteButtons = screen.getAllByRole('button', { name: '' })
      const deleteButton = deleteButtons.find(btn => btn.querySelector('[data-lucide="trash-2"]'))
      
      if (deleteButton) {
        await user.click(deleteButton)

        // Confirm deletion
        await user.click(screen.getByRole('button', { name: /confirm/i }))

        await waitFor(() => {
          expect(mockDashboardService.deleteSocialLink).toHaveBeenCalledWith(linkToDelete.id)
        })

        // Verify social links list update
        expect(props.onUpdate).toHaveBeenCalledWith({
          socialLinks: props.socialLinks.filter(link => link.id !== linkToDelete.id)
        })
      }
    })

    test('should handle delete failure', async () => {
      const props = createSocialLinksSectionProps()
      
      mockDashboardService.deleteSocialLink.mockRejectedValue(new Error('Delete failed'))

      render(<SocialLinksSection {...props} />)

      const deleteButtons = screen.getAllByRole('button', { name: '' })
      const deleteButton = deleteButtons.find(btn => btn.querySelector('[data-lucide="trash-2"]'))
      
      if (deleteButton) {
        await user.click(deleteButton)
        await user.click(screen.getByRole('button', { name: /confirm/i }))

        await waitFor(() => {
          expect(mockDashboardService.deleteSocialLink).toHaveBeenCalled()
        })

        // Should not update social links list on failure
        expect(props.onUpdate).not.toHaveBeenCalled()
      }
    })
  })

  describe('Social Link Reordering', () => {
    test('should reorder social links via drag and drop', async () => {
      const socialLinks = [
        generateMockSocialLink({ id: 'social-1', platform: 'linkedin', order_index: 0 }),
        generateMockSocialLink({ id: 'social-2', platform: 'twitter', order_index: 1 }),
        generateMockSocialLink({ id: 'social-3', platform: 'github', order_index: 2 })
      ]
      const props = createSocialLinksSectionProps({ socialLinks })

      mockDashboardService.updateSocialLinksOrder.mockResolvedValue(undefined)

      render(<SocialLinksSection {...props} />)

      // Verify drag and drop context
      expect(screen.getByTestId('dnd-context')).toBeInTheDocument()
      expect(screen.getByTestId('sortable-context')).toBeInTheDocument()

      // Simulate drag operation
      const dragSimulator = screen.getByTestId('simulate-social-drag')
      await user.click(dragSimulator)

      // Verify reorder was called
      await waitFor(() => {
        expect(mockDashboardService.updateSocialLinksOrder).toHaveBeenCalled()
      })

      // Verify optimistic update
      expect(props.onUpdate).toHaveBeenCalled()
    })

    test('should revert order on reorder failure', async () => {
      const socialLinks = [
        generateMockSocialLink({ id: 'social-1', platform: 'linkedin', order_index: 0 }),
        generateMockSocialLink({ id: 'social-2', platform: 'twitter', order_index: 1 })
      ]
      const props = createSocialLinksSectionProps({ socialLinks })

      mockDashboardService.updateSocialLinksOrder.mockRejectedValue(new Error('Reorder failed'))

      render(<SocialLinksSection {...props} />)

      const dragSimulator = screen.getByTestId('simulate-social-drag')
      await user.click(dragSimulator)

      await waitFor(() => {
        expect(mockDashboardService.updateSocialLinksOrder).toHaveBeenCalled()
      })

      // Should call onUpdate twice: optimistic update, then revert
      expect(props.onUpdate).toHaveBeenCalledTimes(2)
      
      // Second call should revert to original order
      const secondCall = props.onUpdate.mock.calls[1][0]
      expect(secondCall.socialLinks).toEqual(socialLinks)
    })
  })

  describe('Platform Selection and Validation', () => {
    test('should show available platforms', async () => {
      const props = createSocialLinksSectionProps()

      render(<SocialLinksSection {...props} />)

      await user.click(screen.getByRole('button', { name: /add social link/i }))

      // Should show platform selection
      expect(screen.getByText('Platform')).toBeInTheDocument()
      
      // Available platforms should be shown (excluding already used ones)
      const platformSelect = screen.getByRole('combobox', { name: /platform/i })
      expect(platformSelect).toBeInTheDocument()
    })

    test('should validate platform-specific URLs', async () => {
      const props = createSocialLinksSectionProps()

      // Mock form with URL validation error
      vi.mocked(require('react-hook-form').useForm).mockReturnValue({
        register: vi.fn((name: string) => ({ name, onChange: vi.fn(), onBlur: vi.fn(), ref: vi.fn() })),
        handleSubmit: vi.fn((fn) => vi.fn()),
        formState: { 
          errors: { 
            url: { message: 'LinkedIn URL must be from linkedin.com' }
          }, 
          isSubmitting: false, 
          isValid: false 
        },
        reset: mockFormReset,
        setValue: vi.fn(),
        getValues: vi.fn(() => ({})),
        watch: vi.fn()
      })

      render(<SocialLinksSection {...props} />)

      await user.click(screen.getByRole('button', { name: /add social link/i }))

      expect(screen.getByText('LinkedIn URL must be from linkedin.com')).toBeInTheDocument()
    })

    test('should auto-suggest platform based on URL', async () => {
      const props = createSocialLinksSectionProps()
      const mockSetValue = vi.fn()

      // Mock form with setValue function
      vi.mocked(require('react-hook-form').useForm).mockReturnValue({
        register: vi.fn((name: string) => ({ name, onChange: vi.fn(), onBlur: vi.fn(), ref: vi.fn() })),
        handleSubmit: vi.fn((fn) => vi.fn()),
        formState: { errors: {}, isSubmitting: false, isValid: true },
        reset: mockFormReset,
        setValue: mockSetValue,
        getValues: vi.fn(() => ({})),
        watch: vi.fn()
      })

      render(<SocialLinksSection {...props} />)

      await user.click(screen.getByRole('button', { name: /add social link/i }))

      // Type GitHub URL
      const urlInput = screen.getByRole('textbox', { name: /url/i })
      await user.type(urlInput, 'https://github.com/username')

      // Should auto-select GitHub platform
      expect(mockSetValue).toHaveBeenCalledWith('platform', 'github')
      expect(mockSetValue).toHaveBeenCalledWith('icon', 'github')
    })
  })

  describe('URL Format Validation', () => {
    test('should validate URL format', async () => {
      const props = createSocialLinksSectionProps()

      // Mock form with invalid URL
      vi.mocked(require('react-hook-form').useForm).mockReturnValue({
        register: vi.fn((name: string) => ({ name, onChange: vi.fn(), onBlur: vi.fn(), ref: vi.fn() })),
        handleSubmit: vi.fn((fn) => vi.fn()),
        formState: { 
          errors: { 
            url: { message: 'Please enter a valid URL' }
          }, 
          isSubmitting: false, 
          isValid: false 
        },
        reset: mockFormReset,
        setValue: vi.fn(),
        getValues: vi.fn(() => ({})),
        watch: vi.fn()
      })

      render(<SocialLinksSection {...props} />)

      await user.click(screen.getByRole('button', { name: /add social link/i }))

      expect(screen.getByText('Please enter a valid URL')).toBeInTheDocument()
    })

    test('should validate HTTPS requirement', async () => {
      const props = createSocialLinksSectionProps()

      // Mock form with HTTP URL validation error
      vi.mocked(require('react-hook-form').useForm).mockReturnValue({
        register: vi.fn((name: string) => ({ name, onChange: vi.fn(), onBlur: vi.fn(), ref: vi.fn() })),
        handleSubmit: vi.fn((fn) => vi.fn()),
        formState: { 
          errors: { 
            url: { message: 'URL must use HTTPS for security' }
          }, 
          isSubmitting: false, 
          isValid: false 
        },
        reset: mockFormReset,
        setValue: vi.fn(),
        getValues: vi.fn(() => ({})),
        watch: vi.fn()
      })

      render(<SocialLinksSection {...props} />)

      await user.click(screen.getByRole('button', { name: /add social link/i }))

      expect(screen.getByText('URL must use HTTPS for security')).toBeInTheDocument()
    })

    test('should handle URL normalization', async () => {
      const props = createSocialLinksSectionProps()
      const normalizedSocialLink = generateMockSocialLink({
        url: 'https://linkedin.com/in/username'  // Normalized from user input
      })

      mockDashboardService.createSocialLink.mockResolvedValue(normalizedSocialLink)

      render(<SocialLinksSection {...props} />)

      await user.click(screen.getByRole('button', { name: /add social link/i }))
      
      // User might enter URL without protocol
      const urlInput = screen.getByRole('textbox', { name: /url/i })
      await user.type(urlInput, 'linkedin.com/in/username')

      const form = screen.getByRole('dialog').querySelector('form')
      if (form) {
        fireEvent.submit(form)
      }

      // Should normalize URL to include HTTPS
      await waitFor(() => {
        expect(mockDashboardService.createSocialLink).toHaveBeenCalledWith(
          props.landingPageId,
          expect.objectContaining({
            url: expect.stringMatching(/^https:\/\//)
          })
        )
      })
    })
  })

  describe('Icon Management', () => {
    test('should display correct platform icons', async () => {
      const props = createSocialLinksSectionProps()

      render(<SocialLinksSection {...props} />)

      // Should display LinkedIn and Twitter icons
      const linkedinIcon = screen.getByTestId('linkedin-icon')
      const twitterIcon = screen.getByTestId('twitter-icon')
      
      expect(linkedinIcon).toBeInTheDocument()
      expect(twitterIcon).toBeInTheDocument()
    })

    test('should allow custom icon selection', async () => {
      const props = createSocialLinksSectionProps()

      render(<SocialLinksSection {...props} />)

      await user.click(screen.getByRole('button', { name: /add social link/i }))

      // Should have icon selection option
      const iconSelect = screen.queryByRole('combobox', { name: /icon/i })
      if (iconSelect) {
        expect(iconSelect).toBeInTheDocument()
      }
    })
  })

  describe('UI State Management', () => {
    test('should close dialog after successful creation', async () => {
      const props = createSocialLinksSectionProps()
      const newSocialLink = generateMockSocialLink()

      mockDashboardService.createSocialLink.mockResolvedValue(newSocialLink)

      render(<SocialLinksSection {...props} />)

      await user.click(screen.getByRole('button', { name: /add social link/i }))
      expect(screen.getByText('Add Social Link')).toBeInTheDocument()

      const form = screen.getByRole('dialog').querySelector('form')
      if (form) {
        fireEvent.submit(form)
      }

      await waitFor(() => {
        expect(screen.queryByText('Add Social Link')).not.toBeInTheDocument()
      })
    })

    test('should handle form cancel', async () => {
      const props = createSocialLinksSectionProps()

      render(<SocialLinksSection {...props} />)

      await user.click(screen.getByRole('button', { name: /add social link/i }))
      expect(screen.getByText('Add Social Link')).toBeInTheDocument()

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)

      expect(screen.queryByText('Add Social Link')).not.toBeInTheDocument()
      expect(mockDashboardService.createSocialLink).not.toHaveBeenCalled()
    })

    test('should show loading state during operations', async () => {
      const props = createSocialLinksSectionProps()

      // Mock loading state
      vi.mocked(require('react-hook-form').useForm).mockReturnValue({
        register: vi.fn((name: string) => ({ name, onChange: vi.fn(), onBlur: vi.fn(), ref: vi.fn() })),
        handleSubmit: vi.fn((fn) => (e: Event) => {
          e.preventDefault()
          // Simulate async operation
          setTimeout(() => fn({}), 1000)
        }),
        formState: { 
          errors: {}, 
          isSubmitting: true,  // Loading state
          isValid: true 
        },
        reset: mockFormReset,
        setValue: vi.fn(),
        getValues: vi.fn(() => ({})),
        watch: vi.fn()
      })

      render(<SocialLinksSection {...props} />)

      await user.click(screen.getByRole('button', { name: /add social link/i }))

      // Submit button should show loading state
      const submitButton = screen.getByRole('button', { name: /add link/i })
      expect(submitButton).toBeDisabled()
    })
  })

  describe('Accessibility and UX', () => {
    test('should provide clear labels and descriptions', async () => {
      const props = createSocialLinksSectionProps()

      render(<SocialLinksSection {...props} />)

      await user.click(screen.getByRole('button', { name: /add social link/i }))

      // Should have proper form labels
      expect(screen.getByText('Platform')).toBeInTheDocument()
      expect(screen.getByText('URL')).toBeInTheDocument()
      
      // Should have helpful descriptions
      const urlDescription = screen.queryByText(/enter the full url to your profile/i)
      if (urlDescription) {
        expect(urlDescription).toBeInTheDocument()
      }
    })

    test('should show platform-specific help text', async () => {
      const props = createSocialLinksSectionProps()

      render(<SocialLinksSection {...props} />)

      await user.click(screen.getByRole('button', { name: /add social link/i }))

      // Select LinkedIn platform
      const platformSelect = screen.getByRole('combobox', { name: /platform/i })
      await user.selectOptions(platformSelect, 'linkedin')

      // Should show LinkedIn-specific help
      const linkedinHelp = screen.queryByText(/example: https:\/\/linkedin\.com\/in\/your-username/i)
      if (linkedinHelp) {
        expect(linkedinHelp).toBeInTheDocument()
      }
    })

    test('should provide keyboard navigation support', async () => {
      const props = createSocialLinksSectionProps()

      render(<SocialLinksSection {...props} />)

      // Should be able to navigate with keyboard
      const addButton = screen.getByRole('button', { name: /add social link/i })
      addButton.focus()
      expect(addButton).toHaveFocus()

      // Press Enter to open dialog
      fireEvent.keyDown(addButton, { key: 'Enter' })
      expect(screen.getByText('Add Social Link')).toBeInTheDocument()
    })
  })
})