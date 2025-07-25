"use client"

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TextInput } from '@/components/ui/text-input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Check, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { OnboardingService, OnboardingData } from '@/lib/supabase/onboarding-service';
import { callAi, AiType } from '@/lib/ai/onboarding-ai';

interface OnboardingWizardProps {
  userId: string;
  onComplete: (data: OnboardingData) => void;
  devMode?: boolean;
}

const STEPS = [
  { id: 1, title: 'User Info', description: 'Basic information' },
  { id: 2, title: 'About', description: 'Your story' },
  { id: 3, title: 'Services', description: 'What you offer' },
  { id: 4, title: 'Highlights', description: 'Key achievements' },
  { id: 5, title: 'CTA', description: 'Call to action' }
];

const STORAGE_KEY = 'landie-onboarding-data';

export default function OnboardingWizard({ userId, onComplete, devMode = false }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [aiLoading, setAiLoading] = useState<Record<AiType, boolean>>({
    bio: false,
    services: false,
    highlights: false,
  });
  const [aiUsed, setAiUsed] = useState<Record<AiType, boolean>>({
    bio: false,
    services: false,
    highlights: false,
  });
  const [data, setData] = useState<OnboardingData>({
    name: '',
    username: '',
    additionalInfo: '',
    headline: '',
    subheadline: '',
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
  });

  const onboardingService = new OnboardingService();

  // Helper functions for localStorage
  const saveToLocalStorage = (data: OnboardingData) => {
    try {
      localStorage.setItem(`${STORAGE_KEY}-${userId}`, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  };

  const loadFromLocalStorage = (): OnboardingData | null => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}-${userId}`);
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      console.error('Failed to load from localStorage:', error);
      return null;
    }
  };

  const clearLocalStorage = () => {
    try {
      localStorage.removeItem(`${STORAGE_KEY}-${userId}`);
    } catch (error) {
      console.error('Failed to clear localStorage:', error);
    }
  };

  // Load existing onboarding data if available
  useEffect(() => {
    const loadExistingData = async () => {
      try {
        // First try to load from localStorage
        const localData = loadFromLocalStorage();
        if (localData) {
          setData(localData);
          return;
        }

        // Skip database loading in dev mode
        if (devMode) {
          console.log('DEV MODE: Skipping database load, using default data');
          return;
        }

        // If no local data, try to load from database
        const existingData = await onboardingService.getUserOnboardingData(userId);
        if (existingData) {
          setData(existingData);
          // Save to localStorage for future use
          saveToLocalStorage(existingData);
        }
      } catch (error) {
        console.error('Failed to load existing onboarding data:', error);
      }
    };

    loadExistingData();
  }, [userId, devMode]);

  const updateData = (updates: Partial<OnboardingData>) => {
    const newData = { ...data, ...updates };
    setData(newData);
    // Clear errors when user updates data
    setErrors({});
    // Save to localStorage
    saveToLocalStorage(newData);
  };

  const handleAiGeneration = async (type: AiType) => {
    try {
      setAiLoading(prev => ({ ...prev, [type]: true }));
      const response = await callAi(type, userId, data);
      
      if (type === 'bio' && typeof response.suggestion === 'string') {
        updateData({ bio: response.suggestion });
      } else if (type === 'services' && Array.isArray(response.suggestion)) {
        // Merge AI suggestions with existing user input, preserving user content
        const mergedServices = response.suggestion.slice(0, data.servicesCount).map((aiService, index) => {
          const existingService = data.services[index];
          return {
            title: existingService?.title?.trim() || aiService.title,
            description: existingService?.description?.trim() || aiService.description
          };
        });
        // Ensure we maintain the user's selected count
        while (mergedServices.length < data.servicesCount) {
          mergedServices.push({ title: '', description: '' });
        }
        updateData({ 
          services: mergedServices
        });
      } else if (type === 'highlights' && Array.isArray(response.suggestion)) {
        // Merge AI suggestions with existing user input, preserving user content
        const mergedHighlights = response.suggestion.slice(0, data.highlightsCount).map((aiHighlight, index) => {
          const existingHighlight = data.highlights[index];
          return {
            title: existingHighlight?.title?.trim() || aiHighlight.title,
            description: existingHighlight?.description?.trim() || aiHighlight.description
          };
        });
        // Ensure we maintain the user's selected count
        while (mergedHighlights.length < data.highlightsCount) {
          mergedHighlights.push({ title: '', description: '' });
        }
        updateData({ 
          highlights: mergedHighlights
        });
      }
      
      setAiUsed(prev => ({ ...prev, [type]: true }));
    } catch (error) {
      console.error(`Failed to generate ${type}:`, error);
      // Show toast error (would need to implement toast system)
    } finally {
      setAiLoading(prev => ({ ...prev, [type]: false }));
    }
  };

  const handleNext = async () => {
    if (!isStepValid()) {
      return;
    }

    if (currentStep === 5) {
      await handleSubmit();
    } else {
      await saveProgress();
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => prev - 1);
  };

  const saveProgress = async () => {
    if (devMode) {
      // In dev mode, skip database writes
      console.log('DEV MODE: Skipping progress save to database');
      return;
    }
    
    try {
      setIsLoading(true);
      await onboardingService.saveOnboardingProgress(userId, data);
    } catch (error) {
      console.error('Failed to save progress:', error);
      setErrors({ general: 'Failed to save progress. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (devMode) {
      // In dev mode, skip database writes but complete the flow
      console.log('DEV MODE: Skipping onboarding completion to database');
      console.log('DEV MODE: Onboarding data:', data);
      onComplete(data);
      return;
    }
    
    try {
      setIsLoading(true);
      await onboardingService.completeOnboarding(userId, data);
      // Clear localStorage after successful completion
      clearLocalStorage();
      onComplete(data);
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
      setErrors({ general: 'Failed to complete onboarding. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const isStepValid = () => {
    return onboardingService.validateStep(currentStep, data);
  };

  const progress = (currentStep / STEPS.length) * 100;

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
          <div className="flex items-center gap-3">
            <h1 className="heading-3">Welcome to Landie</h1>
            {devMode && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                DEV MODE
              </span>
            )}
          </div>
          <span className="caption">Step {currentStep} of {STEPS.length}</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Step Indicators */}
      <div className="flex justify-between">
        {STEPS.map((step) => (
          <div
            key={step.id}
            className={`flex flex-col items-center space-y-2 ${
              step.id <= currentStep ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${
                step.id < currentStep
                  ? 'bg-primary border-primary text-primary-foreground'
                  : step.id === currentStep
                  ? 'border-primary bg-background'
                  : 'border-muted-foreground'
              }`}
            >
              {step.id < currentStep ? (
                <Check className="w-4 h-4" />
              ) : (
                <span className="caption-sm">{step.id}</span>
              )}
            </div>
            <div className="text-center">
              <p className="caption hidden sm:block">{step.title}</p>
              <p className="caption-sm text-muted-foreground hidden md:block">{step.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle>
            {currentStep === 1 && "Let's get to know you"}
            {currentStep === 2 && "Tell us about yourself"}
            {currentStep === 3 && "What services do you offer?"}
            {currentStep === 4 && "What are your key highlights?"}
            {currentStep === 5 && "How do you want people to contact you?"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {errors.general && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-destructive">{errors.general}</p>
            </div>
          )}
          
          {currentStep === 1 && <Step1 data={data} updateData={updateData} />}
          {currentStep === 2 && (
            <Step2 
              data={data} 
              updateData={updateData} 
              onAiGenerate={handleAiGeneration}
              aiLoading={aiLoading}
              aiUsed={aiUsed}
            />
          )}
          {currentStep === 3 && (
            <Step3 
              data={data} 
              updateData={updateData} 
              onAiGenerate={handleAiGeneration}
              aiLoading={aiLoading}
              aiUsed={aiUsed}
            />
          )}
          {currentStep === 4 && (
            <Step4 
              data={data} 
              updateData={updateData} 
              onAiGenerate={handleAiGeneration}
              aiLoading={aiLoading}
              aiUsed={aiUsed}
            />
          )}
          {currentStep === 5 && <Step5 data={data} updateData={updateData} />}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between gap-4 pt-4 md:pt-6">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 1}
          className="flex items-center gap-2 min-w-0"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Back</span>
        </Button>
        <Button
          onClick={handleNext}
          disabled={!isStepValid() || isLoading}
          loading={isLoading}
          className="flex items-center gap-2 min-w-0"
        >
          <span className="hidden sm:inline">
            {currentStep === 5 ? 'Complete Setup' : 'Next'}
          </span>
          <span className="sm:hidden">
            {currentStep === 5 ? 'Complete' : 'Next'}
          </span>
          {currentStep !== 5 && <ChevronRight className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}

// AI Generation Button Component
function AiButton({ 
  type, 
  onGenerate, 
  loading, 
  used 
}: { 
  type: AiType; 
  onGenerate: (type: AiType) => void; 
  loading: boolean; 
  used: boolean; 
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => onGenerate(type)}
      disabled={loading}
      aria-busy={loading}
      aria-disabled={used}
      className="flex items-center gap-2"
    >
      <Sparkles className="w-4 h-4" />
      {loading ? 'Generating...' : used ? 'AI suggestion added' : 'Generate with AI'}
    </Button>
  );
}

// Step 1 - User Info
function Step1({ data, updateData }: { data: OnboardingData; updateData: (updates: Partial<OnboardingData>) => void }) {
  return (
    <div className="space-y-4">
      <p className="paragraph text-muted-foreground">
        Let's start with the basics. This information will be displayed on your landing page.
      </p>
      
      <TextInput
        label="Display Name"
        value={data.name}
        onChange={(e) => updateData({ name: e.target.value })}
        placeholder="e.g., Sarah Johnson"
        tooltip="This is the name shown on your landing page"
        required
      />
      
      <TextInput
        label="Username"
        value={data.username}
        onChange={(e) => updateData({ username: e.target.value })}
        placeholder="e.g., sarahfitness"
        tooltip="This is your landing page URL"
        description="Your landing page will be available at landie.com/sarahfitness"
        required
      />
      
      <div className="space-y-2">
        <Label htmlFor="additionalInfo">Tell us about yourself</Label>
        <Textarea
          id="additionalInfo"
          rows={5}
          placeholder="Tell us about your fitness journey, certifications, training philosophy, or target clients… (optional)"
          maxLength={1000}
          value={data.additionalInfo || ''}
          onChange={(e) => updateData({ additionalInfo: e.target.value })}
        />
        <p className="text-sm text-muted-foreground">
          Optional — sharing your certifications, specialties, training philosophy, or ideal clients helps our AI create better fitness-focused suggestions.
        </p>
      </div>
    </div>
  );
}

// Step 2 - About/Bio
function Step2({ 
  data, 
  updateData, 
  onAiGenerate, 
  aiLoading, 
  aiUsed 
}: { 
  data: OnboardingData; 
  updateData: (updates: Partial<OnboardingData>) => void;
  onAiGenerate: (type: AiType) => void;
  aiLoading: Record<AiType, boolean>;
  aiUsed: Record<AiType, boolean>;
}) {
  return (
    <div className="space-y-4">
      <p className="paragraph text-muted-foreground">
        Tell visitors about yourself. This helps them understand who you are and what you do.
      </p>
      
      <TextInput
        label="Headline (Optional)"
        value={data.headline}
        onChange={(e) => updateData({ headline: e.target.value })}
        placeholder="e.g., Certified Personal Trainer"
        description="A brief title that describes what you do"
      />
      
      <TextInput
        label="Subheadline (Optional)"
        value={data.subheadline}
        onChange={(e) => updateData({ subheadline: e.target.value })}
        placeholder="e.g., Transforming lives through fitness"
        description="A supporting tagline that appears below your headline"
      />
      
      <div className="space-y-2">
        <Label>Bio</Label>
        <Textarea
          value={data.bio}
          onChange={(e) => updateData({ bio: e.target.value })}
          placeholder="Share your fitness journey, training philosophy, certifications, and what drives your passion for helping others achieve their goals..."
          rows={4}
          required
        />
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
          <p className="text-description">This is your main introduction to visitors</p>
          <AiButton
            type="bio"
            onGenerate={onAiGenerate}
            loading={aiLoading.bio}
            used={aiUsed.bio}
          />
        </div>
      </div>
    </div>
  );
}

// Step 3 - Services
function Step3({ 
  data, 
  updateData, 
  onAiGenerate, 
  aiLoading, 
  aiUsed 
}: { 
  data: OnboardingData; 
  updateData: (updates: Partial<OnboardingData>) => void;
  onAiGenerate: (type: AiType) => void;
  aiLoading: Record<AiType, boolean>;
  aiUsed: Record<AiType, boolean>;
}) {
  const updateServicesCount = (count: number) => {
    const newServices = Array.from({ length: count }, (_, i) => 
      data.services[i] || { title: '', description: '' }
    );
    updateData({ servicesCount: count, services: newServices });
  };

  const updateService = (index: number, field: 'title' | 'description', value: string) => {
    const newServices = [...data.services];
    newServices[index] = { ...newServices[index], [field]: value };
    updateData({ services: newServices });
  };

  return (
    <div className="space-y-4">
      <p className="paragraph text-muted-foreground">
        Services are the main offerings displayed on your landing page. You can add images and videos later.
      </p>
      
      <div className="space-y-2">
        <Label>Number of Services</Label>
        <div className="flex gap-2">
          {[1, 2, 3].map((num) => (
            <Button
              key={num}
              variant={data.servicesCount === num ? "default" : "outline"}
              size="sm"
              onClick={() => updateServicesCount(num)}
            >
              {num}
            </Button>
          ))}
        </div>
      </div>

      {data.services.slice(0, data.servicesCount).map((service, index) => (
        <div key={index} className="space-y-3 p-4 border rounded-lg">
          <h4 className="subtitle-4">Service {index + 1}</h4>
          
          <TextInput
            label="Title"
            value={service.title}
            onChange={(e) => updateService(index, 'title', e.target.value)}
            placeholder="e.g., Personal Training"
            required
          />
          
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={service.description}
              onChange={(e) => updateService(index, 'description', e.target.value)}
              placeholder="Describe what this training program includes, target audience, and expected outcomes..."
              rows={3}
              required
            />
          </div>
        </div>
      ))}
      
      <div className="space-y-2 pt-4">
        <p className="text-sm text-muted-foreground text-right">
          💡 <strong>Tip:</strong> Fill out service titles first for better AI generation results
        </p>
        <div className="flex justify-end">
          <AiButton
            type="services"
            onGenerate={onAiGenerate}
            loading={aiLoading.services}
            used={aiUsed.services}
          />
        </div>
      </div>
    </div>
  );
}

// Step 4 - Highlights
function Step4({ 
  data, 
  updateData, 
  onAiGenerate, 
  aiLoading, 
  aiUsed 
}: { 
  data: OnboardingData; 
  updateData: (updates: Partial<OnboardingData>) => void;
  onAiGenerate: (type: AiType) => void;
  aiLoading: Record<AiType, boolean>;
  aiUsed: Record<AiType, boolean>;
}) {
  const updateHighlightsCount = (count: number) => {
    const newHighlights = Array.from({ length: count }, (_, i) => 
      data.highlights[i] || { title: '', description: '' }
    );
    updateData({ highlightsCount: count, highlights: newHighlights });
  };

  const updateHighlight = (index: number, field: 'title' | 'description', value: string) => {
    const newHighlights = [...data.highlights];
    newHighlights[index] = { ...newHighlights[index], [field]: value };
    updateData({ highlights: newHighlights });
  };

  return (
    <div className="space-y-4">
      <p className="paragraph text-muted-foreground">
        Highlights showcase your key achievements, experience, or credentials. Images can be added later.
      </p>
      
      <div className="space-y-2">
        <Label>Number of Highlights</Label>
        <div className="flex gap-2">
          {[1, 2, 3].map((num) => (
            <Button
              key={num}
              variant={data.highlightsCount === num ? "default" : "outline"}
              size="sm"
              onClick={() => updateHighlightsCount(num)}
            >
              {num}
            </Button>
          ))}
        </div>
      </div>

      {data.highlights.slice(0, data.highlightsCount).map((highlight, index) => (
        <div key={index} className="space-y-3 p-4 border rounded-lg">
          <h4 className="subtitle-4">Highlight {index + 1}</h4>
          
          <TextInput
            label="Title"
            value={highlight.title}
            onChange={(e) => updateHighlight(index, 'title', e.target.value)}
            placeholder="e.g., NASM Certified Trainer"
            required
          />
          
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={highlight.description}
              onChange={(e) => updateHighlight(index, 'description', e.target.value)}
              placeholder="Describe this certification, achievement, or area of expertise..."
              rows={3}
              required
            />
          </div>
        </div>
      ))}
      
      <div className="space-y-2 pt-4">
        <p className="text-sm text-muted-foreground text-right">
          💡 <strong>Tip:</strong> Fill out highlight titles first for better AI generation results
        </p>
        <div className="flex justify-end">
          <AiButton
            type="highlights"
            onGenerate={onAiGenerate}
            loading={aiLoading.highlights}
            used={aiUsed.highlights}
          />
        </div>
      </div>
    </div>
  );
}

// Step 5 - CTA
function Step5({ data, updateData }: { data: OnboardingData; updateData: (updates: Partial<OnboardingData>) => void }) {
  return (
    <div className="space-y-6">
      <p className="paragraph text-muted-foreground">
        Choose how you want visitors to contact you and take action on your landing page.
      </p>
      
      {/* Contact Me */}
      <div className="space-y-4 p-4 border rounded-lg">
        <h4 className="subtitle-4">Contact Me</h4>
        <p className="paragraph text-muted-foreground">
          A contact me section allows visitors to send you emails to a contact email you provide.
        </p>
        
        <div className="flex gap-4">
          <Button
            variant={data.wantsContactForm ? "default" : "outline"}
            size="sm"
            onClick={() => updateData({ wantsContactForm: true })}
          >
            Yes
          </Button>
          <Button
            variant={!data.wantsContactForm ? "default" : "outline"}
            size="sm"
            onClick={() => updateData({ wantsContactForm: false })}
          >
            No
          </Button>
        </div>
        
        {data.wantsContactForm && (
          <TextInput
            label="Contact Email"
            type="email"
            value={data.contactEmail}
            onChange={(e) => updateData({ contactEmail: e.target.value })}
            placeholder="your.email@example.com"
            description="Messages from the contact form will be sent to this email"
            required
          />
        )}
      </div>

      {/* CTA Button */}
      <div className="space-y-4 p-4 border rounded-lg">
        <h4 className="subtitle-4">Call-to-Action Button</h4>
        <p className="paragraph text-muted-foreground">
          A prominent button that encourages visitors to take a specific action.
        </p>
        
        <div className="flex gap-4">
          <Button
            variant={data.wantsCTAButton ? "default" : "outline"}
            size="sm"
            onClick={() => updateData({ wantsCTAButton: true })}
          >
            Yes
          </Button>
          <Button
            variant={!data.wantsCTAButton ? "default" : "outline"}
            size="sm"
            onClick={() => updateData({ wantsCTAButton: false })}
          >
            No
          </Button>
        </div>
        
        {data.wantsCTAButton && (
          <div className="space-y-4">
            <TextInput
              label="Button Text"
              value={data.ctaText}
              onChange={(e) => updateData({ ctaText: e.target.value })}
              placeholder="e.g., Start Your Journey, Book Consultation, Train With Me"
              description="The text displayed on your main action button"
              required
            />
            
            <TextInput
              label="Button Link"
              type="url"
              value={data.ctaUrl}
              onChange={(e) => updateData({ ctaUrl: e.target.value })}
              placeholder="https://example.com or mailto:hello@example.com"
              description="Where the button should link to (website, email, etc.)"
              required
            />
          </div>
        )}
      </div>
    </div>
  );
}