"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Instagram, Youtube, Music, Save, Loader2, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FormField } from "@/components/ui/form-field"
import { LandingPage, DashboardData } from "@/types/dashboard"
import { DashboardServiceClient } from "@/lib/supabase/dashboard-service-client"
import { createClient } from "@/lib/supabase/client"

const socialLinksSchema = z.object({
  instagram_url: z.string().url().optional().or(z.literal("")),
  youtube_url: z.string().url().optional().or(z.literal("")),
  tiktok_url: z.string().url().optional().or(z.literal("")),
})

type SocialLinksFormData = z.infer<typeof socialLinksSchema>

interface SocialLinksSectionProps {
  landingPage: LandingPage | null
  onUpdate: (data: Partial<DashboardData>) => void
}

export function SocialLinksSection({ landingPage, onUpdate }: SocialLinksSectionProps) {
  const [isLoading, setIsLoading] = useState(false)
  
  const supabase = createClient()
  const dashboardService = new DashboardServiceClient()

  const form = useForm<SocialLinksFormData>({
    resolver: zodResolver(socialLinksSchema),
    defaultValues: {
      instagram_url: "",
      youtube_url: "",
      tiktok_url: "",
    },
  })

  // Update form when landingPage data changes
  useEffect(() => {
    if (landingPage) {
      form.reset({
        instagram_url: landingPage.instagram_url || "",
        youtube_url: landingPage.youtube_url || "",
        tiktok_url: landingPage.tiktok_url || "",
      })
    }
  }, [landingPage, form])

  const onSubmit = async (data: SocialLinksFormData) => {
    try {
      setIsLoading(true)
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No user found')

      const updatedLandingPage = await dashboardService.updateLandingPage(user.id, data)
      
      if (updatedLandingPage) {
        onUpdate({ landingPage: updatedLandingPage })
        // TODO: Add success toast
      }
    } catch (error) {
      console.error('Error updating social links:', error)
      // TODO: Add error toast
    } finally {
      setIsLoading(false)
    }
  }

  const socialPlatforms = [
    {
      name: "Instagram",
      key: "instagram_url" as keyof SocialLinksFormData,
      icon: Instagram,
      placeholder: "https://instagram.com/yourusername",
      description: "Connect your Instagram profile"
    },
    {
      name: "YouTube",
      key: "youtube_url" as keyof SocialLinksFormData,
      icon: Youtube,
      placeholder: "https://youtube.com/channel/yourchannelid",
      description: "Link to your YouTube channel"
    },
    {
      name: "TikTok",
      key: "tiktok_url" as keyof SocialLinksFormData,
      icon: Music,
      placeholder: "https://tiktok.com/@yourusername",
      description: "Connect your TikTok account"
    }
  ]

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Sticky Header */}
      <div className="sticky top-0 lg:top-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10 pb-4 border-b lg:border-b-0">
        <h1 className="heading-5 lg:heading-4 font-bold">Social Links</h1>
        <p className="text-description lg:paragraph">
          Connect your social media accounts to your landing page
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Social Media Profiles</CardTitle>
          <CardDescription>
            Add links to your social media accounts. These will be displayed on your landing page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 lg:space-y-6">
            {socialPlatforms.map((platform) => {
              return (
                <div key={platform.key} className="space-y-2">
                  <FormField
                    label={platform.name}
                    placeholder={platform.placeholder}
                    description={platform.description}
                    {...form.register(platform.key)}
                    error={form.formState.errors[platform.key]?.message}
                  />
                </div>
              )
            })}

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
                    Save Social Links
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preview</CardTitle>
          <CardDescription>
            See how your social links will appear on your landing page
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 lg:gap-4">
            {socialPlatforms.map((platform) => {
              const url = form.watch(platform.key)
              
              if (!url) return null
              
              return (
                <a
                  key={platform.key}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 lg:px-4 lg:py-2 bg-muted rounded-lg hover:bg-muted/80 transition-colors min-w-[120px]"
                >
                  <platform.icon className="h-4 w-4 flex-shrink-0" />
                  <span className="label">{platform.name}</span>
                  <ExternalLink className="h-3 w-3 flex-shrink-0" />
                </a>
              )
            })}
          </div>
          
          {!form.watch("instagram_url") && !form.watch("youtube_url") && !form.watch("tiktok_url") && (
            <div className="text-center py-6 lg:py-8 text-muted-foreground">
              <p className="paragraph">
                Add social media links above to see them appear here
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}