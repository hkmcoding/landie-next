import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, describe, vi, beforeEach } from 'vitest'
import { ProfileSection } from '@/components/dashboard/sections/ProfileSection'
import { LandingPage } from '@/types/dashboard'

// Mock data generators
const generateMockLandingPage = (overrides: Partial<LandingPage> = {}): LandingPage => ({
  id: 'test-landing-page',
  user_id: 'test-user',
  name: 'John Doe',
  username: 'johndoe',
  headline: 'Senior Software Engineer',
  subheadline: 'Building amazing web applications',
  bio: 'Passionate software engineer with 5+ years of experience in full-stack development.',
  contact_email: 'john@example.com',
  cta_button_text: 'Get In Touch',
  cta_button_url: 'mailto:john@example.com',
  profile_image_url: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides
})

const createProfileSectionProps = (overrides: any = {}) => ({
  landingPage: generateMockLandingPage(),
  onUpdate: vi.fn(),
  ...overrides
})

// Mock dashboard service
const mockDashboardService = {
  updateLandingPage: vi.fn(),
  uploadProfileImage: vi.fn(),
  deleteProfileImage: vi.fn()
}

vi.mock('@/lib/supabase/dashboard-service-client', () => ({
  DashboardServiceClient: vi.fn(() => mockDashboardService)
}))

// Mock file upload
const mockFileUpload = {
  upload: vi.fn(),
  getPublicUrl: vi.fn()
}

vi.mock('@/lib/file-upload', () => ({
  FileUploadService: vi.fn(() => mockFileUpload)
}))

// Mock form
const mockFormReset = vi.fn()
const mockFormSetValue = vi.fn()

vi.mock('react-hook-form', () => ({
  useForm: () => ({
    register: vi.fn((name: string) => ({ 
      name, 
      onChange: vi.fn(), 
      onBlur: vi.fn(), 
      ref: vi.fn() 
    })),
    handleSubmit: vi.fn((fn) => (e: Event) => {
      e.preventDefault()
      fn({
        name: 'Updated John Doe',
        headline: 'Updated Senior Developer',
        subheadline: 'Updated tagline',
        bio: 'Updated bio with new information about experience and skills.',
        contact_email: 'updated.john@example.com',
        cta_button_text: 'Contact Me',
        cta_button_url: 'mailto:updated.john@example.com'
      })
    }),
    formState: { 
      errors: {}, 
      isSubmitting: false, 
      isValid: true,
      isDirty: true
    },
    reset: mockFormReset,
    setValue: mockFormSetValue,
    getValues: vi.fn(() => ({})),
    watch: vi.fn()
  })
}))

describe('Profile Section Editing', () => {
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    user = userEvent.setup()
    vi.clearAllMocks()
    mockFormReset.mockClear()
    mockFormSetValue.mockClear()
  })

  describe('Profile Information Update', () => {
    test('should update profile information', async () => {
      const props = createProfileSectionProps()
      const updatedProfile = {
        ...props.landingPage,
        name: 'Updated John Doe',
        headline: 'Updated Senior Developer',
        bio: 'Updated bio with new information'
      }

      mockDashboardService.updateLandingPage.mockResolvedValue(updatedProfile)

      render(<ProfileSection {...props} />)

      // Click edit button
      await user.click(screen.getByRole('button', { name: /edit profile/i }))
      expect(screen.getByText('Edit Profile Information')).toBeInTheDocument()

      // Submit form
      const form = screen.getByRole('dialog').querySelector('form')
      if (form) {
        fireEvent.submit(form)
      }

      // Verify profile update
      await waitFor(() => {
        expect(mockDashboardService.updateLandingPage).toHaveBeenCalledWith(
          props.landingPage.id,
          expect.objectContaining({
            name: 'Updated John Doe',
            headline: 'Updated Senior Developer',
            bio: 'Updated bio with new information about experience and skills.'
          })
        )
      })

      // Verify UI update
      expect(props.onUpdate).toHaveBeenCalledWith({
        landingPage: updatedProfile
      })
    })

    test('should pre-populate form with existing data', async () => {
      const props = createProfileSectionProps()

      render(<ProfileSection {...props} />)

      await user.click(screen.getByRole('button', { name: /edit profile/i }))

      // Verify form is pre-populated
      expect(mockFormReset).toHaveBeenCalledWith(
        expect.objectContaining({
          name: props.landingPage.name,
          headline: props.landingPage.headline,
          subheadline: props.landingPage.subheadline,
          bio: props.landingPage.bio,
          contact_email: props.landingPage.contact_email,
          cta_button_text: props.landingPage.cta_button_text,
          cta_button_url: props.landingPage.cta_button_url
        })
      )
    })

    test('should handle profile update failure', async () => {
      const props = createProfileSectionProps()
      
      mockDashboardService.updateLandingPage.mockRejectedValue(new Error('Update failed'))

      render(<ProfileSection {...props} />)

      await user.click(screen.getByRole('button', { name: /edit profile/i }))
      
      const form = screen.getByRole('dialog').querySelector('form')
      if (form) {
        fireEvent.submit(form)
      }

      await waitFor(() => {
        expect(mockDashboardService.updateLandingPage).toHaveBeenCalled()
      })

      // Should not update on failure
      expect(props.onUpdate).not.toHaveBeenCalled()

      // Should show error message
      expect(screen.getByText(/failed to update profile/i)).toBeInTheDocument()
    })
  })

  describe('Profile Image Management', () => {
    test('should upload new profile image', async () => {
      const props = createProfileSectionProps()
      const mockFile = new File(['fake image'], 'profile.jpg', { type: 'image/jpeg' })
      const imageUrl = 'https://example.com/uploaded-profile.jpg'

      mockFileUpload.upload.mockResolvedValue({ url: imageUrl })
      mockDashboardService.updateLandingPage.mockResolvedValue({
        ...props.landingPage,
        profile_image_url: imageUrl
      })

      render(<ProfileSection {...props} />)

      // Click upload image button
      const uploadButton = screen.getByRole('button', { name: /upload image/i })
      await user.click(uploadButton)

      // Simulate file selection
      const fileInput = screen.getByRole('button', { name: /choose file/i })
      
      // Mock file input behavior
      Object.defineProperty(fileInput, 'files', {
        value: [mockFile],
        configurable: true,
      })

      fireEvent.change(fileInput)

      await waitFor(() => {
        expect(mockFileUpload.upload).toHaveBeenCalledWith(mockFile, expect.any(String))
      })

      // Verify profile update with new image
      expect(mockDashboardService.updateLandingPage).toHaveBeenCalledWith(
        props.landingPage.id,
        expect.objectContaining({
          profile_image_url: imageUrl
        })
      )
    })

    test('should delete existing profile image', async () => {
      const props = createProfileSectionProps({
        landingPage: generateMockLandingPage({
          profile_image_url: 'https://example.com/existing-profile.jpg'
        })
      })

      mockDashboardService.updateLandingPage.mockResolvedValue({
        ...props.landingPage,
        profile_image_url: null
      })

      render(<ProfileSection {...props} />)

      // Click delete image button
      await user.click(screen.getByRole('button', { name: /delete image/i }))

      // Confirm deletion
      await user.click(screen.getByRole('button', { name: /confirm/i }))

      await waitFor(() => {
        expect(mockDashboardService.updateLandingPage).toHaveBeenCalledWith(
          props.landingPage.id,
          expect.objectContaining({
            profile_image_url: null
          })
        )
      })

      // Verify UI update
      expect(props.onUpdate).toHaveBeenCalledWith({
        landingPage: expect.objectContaining({
          profile_image_url: null
        })
      })
    })

    test('should validate image file type', async () => {
      const props = createProfileSectionProps()
      const invalidFile = new File(['fake document'], 'document.pdf', { type: 'application/pdf' })

      render(<ProfileSection {...props} />)

      const uploadButton = screen.getByRole('button', { name: /upload image/i })
      await user.click(uploadButton)

      const fileInput = screen.getByRole('button', { name: /choose file/i })
      
      Object.defineProperty(fileInput, 'files', {
        value: [invalidFile],
        configurable: true,
      })

      fireEvent.change(fileInput)

      // Should show validation error
      expect(screen.getByText(/please select a valid image file/i)).toBeInTheDocument()
      expect(mockFileUpload.upload).not.toHaveBeenCalled()
    })

    test('should validate image file size', async () => {
      const props = createProfileSectionProps()
      
      // Create large file (>5MB)
      const largeFile = new File(['x'.repeat(6 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' })

      render(<ProfileSection {...props} />)

      const uploadButton = screen.getByRole('button', { name: /upload image/i })
      await user.click(uploadButton)

      const fileInput = screen.getByRole('button', { name: /choose file/i })
      
      Object.defineProperty(fileInput, 'files', {
        value: [largeFile],
        configurable: true,
      })

      fireEvent.change(fileInput)

      // Should show size validation error
      expect(screen.getByText(/image file is too large/i)).toBeInTheDocument()
      expect(mockFileUpload.upload).not.toHaveBeenCalled()
    })
  })

  describe('Username Validation', () => {
    test('should validate username uniqueness', async () => {
      const props = createProfileSectionProps()

      // Mock form with username validation error
      vi.mocked(require('react-hook-form').useForm).mockReturnValue({
        register: vi.fn((name: string) => ({ name, onChange: vi.fn(), onBlur: vi.fn(), ref: vi.fn() })),
        handleSubmit: vi.fn((fn) => vi.fn()),
        formState: { 
          errors: { 
            username: { message: 'Username is already taken' }
          }, 
          isSubmitting: false, 
          isValid: false 
        },
        reset: mockFormReset,
        setValue: mockFormSetValue,
        getValues: vi.fn(() => ({})),
        watch: vi.fn()
      })

      render(<ProfileSection {...props} />)

      await user.click(screen.getByRole('button', { name: /edit profile/i }))

      expect(screen.getByText('Username is already taken')).toBeInTheDocument()
    })

    test('should validate username format', async () => {
      const props = createProfileSectionProps()

      // Mock form with format validation error
      vi.mocked(require('react-hook-form').useForm).mockReturnValue({
        register: vi.fn((name: string) => ({ name, onChange: vi.fn(), onBlur: vi.fn(), ref: vi.fn() })),
        handleSubmit: vi.fn((fn) => vi.fn()),
        formState: { 
          errors: { 
            username: { message: 'Username can only contain letters, numbers, and underscores' }
          }, 
          isSubmitting: false, 
          isValid: false 
        },
        reset: mockFormReset,
        setValue: mockFormSetValue,
        getValues: vi.fn(() => ({})),
        watch: vi.fn()
      })

      render(<ProfileSection {...props} />)

      await user.click(screen.getByRole('button', { name: /edit profile/i }))

      expect(screen.getByText('Username can only contain letters, numbers, and underscores')).toBeInTheDocument()
    })
  })

  describe('Form Validation', () => {
    test('should validate required fields', async () => {
      const props = createProfileSectionProps()

      // Mock form with validation errors
      vi.mocked(require('react-hook-form').useForm).mockReturnValue({
        register: vi.fn((name: string) => ({ name, onChange: vi.fn(), onBlur: vi.fn(), ref: vi.fn() })),
        handleSubmit: vi.fn((fn) => vi.fn()),
        formState: { 
          errors: { 
            name: { message: 'Name is required' },
            username: { message: 'Username is required' },
            bio: { message: 'Bio is required' }
          }, 
          isSubmitting: false, 
          isValid: false 
        },
        reset: mockFormReset,
        setValue: mockFormSetValue,
        getValues: vi.fn(() => ({})),
        watch: vi.fn()
      })

      render(<ProfileSection {...props} />)

      await user.click(screen.getByRole('button', { name: /edit profile/i }))

      // Should show validation errors
      expect(screen.getByText('Name is required')).toBeInTheDocument()
      expect(screen.getByText('Username is required')).toBeInTheDocument()
      expect(screen.getByText('Bio is required')).toBeInTheDocument()
    })

    test('should validate email format', async () => {
      const props = createProfileSectionProps()

      // Mock form with email validation error
      vi.mocked(require('react-hook-form').useForm).mockReturnValue({
        register: vi.fn((name: string) => ({ name, onChange: vi.fn(), onBlur: vi.fn(), ref: vi.fn() })),
        handleSubmit: vi.fn((fn) => vi.fn()),
        formState: { 
          errors: { 
            contact_email: { message: 'Please enter a valid email address' }
          }, 
          isSubmitting: false, 
          isValid: false 
        },
        reset: mockFormReset,
        setValue: mockFormSetValue,
        getValues: vi.fn(() => ({})),
        watch: vi.fn()
      })

      render(<ProfileSection {...props} />)

      await user.click(screen.getByRole('button', { name: /edit profile/i }))

      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument()
    })

    test('should validate CTA button URL format', async () => {
      const props = createProfileSectionProps()

      // Mock form with URL validation error
      vi.mocked(require('react-hook-form').useForm).mockReturnValue({
        register: vi.fn((name: string) => ({ name, onChange: vi.fn(), onBlur: vi.fn(), ref: vi.fn() })),
        handleSubmit: vi.fn((fn) => vi.fn()),
        formState: { 
          errors: { 
            cta_button_url: { message: 'Please enter a valid URL' }
          }, 
          isSubmitting: false, 
          isValid: false 
        },
        reset: mockFormReset,
        setValue: mockFormSetValue,
        getValues: vi.fn(() => ({})),
        watch: vi.fn()
      })

      render(<ProfileSection {...props} />)

      await user.click(screen.getByRole('button', { name: /edit profile/i }))

      expect(screen.getByText('Please enter a valid URL')).toBeInTheDocument()
    })

    test('should validate bio length', async () => {
      const props = createProfileSectionProps()

      // Mock form with bio length validation
      vi.mocked(require('react-hook-form').useForm).mockReturnValue({
        register: vi.fn((name: string) => ({ name, onChange: vi.fn(), onBlur: vi.fn(), ref: vi.fn() })),
        handleSubmit: vi.fn((fn) => vi.fn()),
        formState: { 
          errors: { 
            bio: { message: 'Bio must be at least 50 characters long' }
          }, 
          isSubmitting: false, 
          isValid: false 
        },
        reset: mockFormReset,
        setValue: mockFormSetValue,
        getValues: vi.fn(() => ({})),
        watch: vi.fn()
      })

      render(<ProfileSection {...props} />)

      await user.click(screen.getByRole('button', { name: /edit profile/i }))

      expect(screen.getByText('Bio must be at least 50 characters long')).toBeInTheDocument()
    })
  })

  describe('Live Preview Integration', () => {
    test('should update live preview when editing', async () => {
      const props = createProfileSectionProps()

      render(<ProfileSection {...props} />)

      await user.click(screen.getByRole('button', { name: /edit profile/i }))

      // Mock real-time updates (would be handled by watch() in real implementation)
      const nameInput = screen.getByRole('textbox', { name: /name/i })
      await user.clear(nameInput)
      await user.type(nameInput, 'Live Preview Name')

      // Verify setValue is called for live preview updates
      expect(mockFormSetValue).toHaveBeenCalledWith('name', 'Live Preview Name')
    })

    test('should reset live preview on cancel', async () => {
      const props = createProfileSectionProps()

      render(<ProfileSection {...props} />)

      await user.click(screen.getByRole('button', { name: /edit profile/i }))

      // Cancel editing
      await user.click(screen.getByRole('button', { name: /cancel/i }))

      // Should not update profile
      expect(mockDashboardService.updateLandingPage).not.toHaveBeenCalled()
      expect(props.onUpdate).not.toHaveBeenCalled()
    })
  })

  describe('UI State Management', () => {
    test('should disable form during submission', async () => {
      const props = createProfileSectionProps()

      // Mock submitting state
      vi.mocked(require('react-hook-form').useForm).mockReturnValue({
        register: vi.fn((name: string) => ({ name, onChange: vi.fn(), onBlur: vi.fn(), ref: vi.fn() })),
        handleSubmit: vi.fn((fn) => (e: Event) => {
          e.preventDefault()
          // Simulate async submission
          setTimeout(() => fn({}), 1000)
        }),
        formState: { 
          errors: {}, 
          isSubmitting: true,  // Submitting state
          isValid: true 
        },
        reset: mockFormReset,
        setValue: mockFormSetValue,
        getValues: vi.fn(() => ({})),
        watch: vi.fn()
      })

      render(<ProfileSection {...props} />)

      await user.click(screen.getByRole('button', { name: /edit profile/i }))

      // Submit button should be disabled during submission
      const submitButton = screen.getByRole('button', { name: /save changes/i })
      expect(submitButton).toBeDisabled()
    })

    test('should show unsaved changes warning', async () => {
      const props = createProfileSectionProps()

      // Mock dirty state
      vi.mocked(require('react-hook-form').useForm).mockReturnValue({
        register: vi.fn((name: string) => ({ name, onChange: vi.fn(), onBlur: vi.fn(), ref: vi.fn() })),
        handleSubmit: vi.fn((fn) => vi.fn()),
        formState: { 
          errors: {}, 
          isSubmitting: false, 
          isValid: true,
          isDirty: true  // Form has unsaved changes
        },
        reset: mockFormReset,
        setValue: mockFormSetValue,
        getValues: vi.fn(() => ({})),
        watch: vi.fn()
      })

      render(<ProfileSection {...props} />)

      await user.click(screen.getByRole('button', { name: /edit profile/i }))

      // Try to close without saving
      await user.click(screen.getByRole('button', { name: /close/i }))

      // Should show unsaved changes warning
      expect(screen.getByText(/you have unsaved changes/i)).toBeInTheDocument()
    })

    test('should close dialog after successful save', async () => {
      const props = createProfileSectionProps()
      const updatedProfile = { ...props.landingPage, name: 'Updated Name' }

      mockDashboardService.updateLandingPage.mockResolvedValue(updatedProfile)

      render(<ProfileSection {...props} />)

      await user.click(screen.getByRole('button', { name: /edit profile/i }))
      expect(screen.getByText('Edit Profile Information')).toBeInTheDocument()

      const form = screen.getByRole('dialog').querySelector('form')
      if (form) {
        fireEvent.submit(form)
      }

      await waitFor(() => {
        expect(screen.queryByText('Edit Profile Information')).not.toBeInTheDocument()
      })
    })
  })
})