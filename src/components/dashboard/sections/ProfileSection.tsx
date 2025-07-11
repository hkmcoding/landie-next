"use client"

import { useState } from "react"
import Image from 'next/image'
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Save, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FormField } from "@/components/ui/form-field"
import { FileUpload } from "@/components/ui/file-upload"
import { LandingPage, DashboardData, UpdateLandingPageInput } from "@/types/dashboard"
import { DashboardServiceClient } from "@/lib/supabase/dashboard-service-client"
import { createClient } from "@/lib/supabase/client"

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  headline: z.string().min(5, "Headline must be at least 5 characters"),
  subheadline: z.string().min(10, "Subheadline must be at least 10 characters"),
  contact_email: z.string().email("Must be a valid email"),
})

type ProfileFormData = z.infer<typeof profileSchema>

interface ProfileSectionProps {
  landingPage: LandingPage | null
  onUpdate: (data: Partial<DashboardData>) => void
}

export function ProfileSection({ landingPage, onUpdate }: ProfileSectionProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [profileImage, setProfileImage] = useState<string | null>(landingPage?.profile_image_url || null)
  
  const supabase = createClient()
  const dashboardService = new DashboardServiceClient()

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: landingPage?.name || "",
      username: landingPage?.username || "",
      headline: landingPage?.headline || "",
      subheadline: landingPage?.subheadline || "",
      contact_email: landingPage?.contact_email || "",
    },
  })


  const onSubmit = async (data: ProfileFormData) => {
    try {
      setIsLoading(true)
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No user found')

      const updateData: UpdateLandingPageInput = {
        ...data,
        profile_image_url: profileImage
      }

      const updatedLandingPage = await dashboardService.updateLandingPage(user.id, updateData)
      
      if (updatedLandingPage) {
        onUpdate({ landingPage: updatedLandingPage })
        // TODO: Add success toast
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      // TODO: Add error toast
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Sticky Header */}
      <div className="sticky top-0 lg:top-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10 pb-4 border-b lg:border-b-0">
        <h1 className="heading-5 lg:heading-4 font-bold">Profile Setup</h1>
        <p className="text-description lg:paragraph">
          Configure your profile information and upload your photo
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile Photo</CardTitle>
          <CardDescription>
            Upload a professional photo that represents you
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {profileImage && (
              <div className="flex items-center gap-4">
                <Image
                  src={profileImage}
                  alt="Current profile"
                  width={80}
                  height={80}
                  className="w-20 h-20 rounded-full object-cover border"
                />
                <div>
                  <p className="label font-medium">Current Profile Photo</p>
                  <button
                    onClick={async () => {
                      try {
                        const { data: { user } } = await supabase.auth.getUser();
                        if (!user) throw new Error('No user found');

                        const updatedLandingPage = await dashboardService.updateLandingPage(user.id, {
                          profile_image_url: null
                        });
                        
                        if (updatedLandingPage) {
                          setProfileImage(null);
                          onUpdate({ landingPage: updatedLandingPage });
                        }
                      } catch (error) {
                        console.error('Error removing image:', error);
                      }
                    }}
                    className="text-error hover:underline"
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}
            
            <FileUpload
              label="Upload New Profile Photo"
              onFileChange={async (file) => {
                if (file) {
                  try {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (!user) throw new Error('No user found');

                    const fileExt = file.name.split('.').pop();
                    const fileName = `${user.id}/profile-${Date.now()}.${fileExt}`;
                    
                    const imageUrl = await dashboardService.uploadImage('profile-images', fileName, file);
                    
                    setProfileImage(imageUrl);
                    
                    const updatedLandingPage = await dashboardService.updateLandingPage(user.id, {
                      profile_image_url: imageUrl
                    });
                    
                    if (updatedLandingPage) {
                      onUpdate({ landingPage: updatedLandingPage });
                    }
                  } catch (error) {
                    console.error('Error uploading image:', error);
                  }
                }
              }}
              maxSize={5}
              acceptedTypes="image/*"
              showPreview={true}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>
            Your name, username, and contact details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 lg:space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label="Full Name"
                placeholder="John Doe"
                {...form.register("name")}
                error={form.formState.errors.name?.message}
              />
              <FormField
                label="Username"
                placeholder="johndoe"
                {...form.register("username")}
                error={form.formState.errors.username?.message}
              />
            </div>

            <FormField
              label="Headline"
              placeholder="Professional Fitness Trainer & Wellness Coach"
              {...form.register("headline")}
              error={form.formState.errors.headline?.message}
            />

            <FormField
              label="Subheadline"
              placeholder="Helping busy professionals achieve their fitness goals"
              {...form.register("subheadline")}
              error={form.formState.errors.subheadline?.message}
            />

            <FormField
              label="Contact Email"
              type="email"
              placeholder="john@example.com"
              {...form.register("contact_email")}
              error={form.formState.errors.contact_email?.message}
            />

            <div className="flex justify-end pt-4">
              <Button 
                type="submit" 
                disabled={isLoading}
                className="w-full sm:w-auto min-w-[140px]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Profile
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}