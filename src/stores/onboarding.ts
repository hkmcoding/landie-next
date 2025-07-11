import { create } from 'zustand';

export interface OnboardingData {
  profileImageUrl: string | null;
  name: string;
  username: string;
  headline: string;
  subheadline: string;
  bio: string;
  contactEmail: string;
  instagramUrl: string;
  youtubeUrl: string;
  tiktokUrl: string;
  themeSide: 'light' | 'dark';
  showContactForm: boolean;
  ctaText: string;
  ctaUrl: string;
  services: {
    id?: string;
    title: string;
    description: string;
    price?: string;
    buttonText: string;
    buttonUrl: string;
    imageUrls: string[];
    youtubeUrl: string;
  }[];
  testimonials: {
    id?: string;
    quote: string;
    authorName: string;
    description: string;
    imageUrls: string[];
    youtubeUrl: string;
  }[];
  highlights: {
    id?: string;
    header: string;
    content: string;
  }[];
}

interface OnboardingStore {
  onboardingData: OnboardingData | null;
  isLoaded: boolean;
  setOnboardingData: (data: OnboardingData) => void;
  clearOnboardingData: () => void;
  hydrate: () => void;
}

const LOCAL_STORAGE_KEY = 'onboardingData';

export const useOnboardingStore = create<OnboardingStore>((set) => ({
  onboardingData: null,
  isLoaded: false,
  setOnboardingData: (data: OnboardingData) => {
    set({ onboardingData: data, isLoaded: true });
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
    }
  },
  clearOnboardingData: () => {
    set({ onboardingData: null, isLoaded: false });
    if (typeof window !== 'undefined') {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
  },
  hydrate: () => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        set({ onboardingData: JSON.parse(stored) as OnboardingData, isLoaded: true });
      } else {
        set({ isLoaded: true });
      }
    }
  },
})); 