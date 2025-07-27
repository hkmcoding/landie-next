import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'

interface AnalyticsEvent {
  type: 'page_view' | 'cta_click' | 'unique_visitor' | 'page_time' | 'section_view'
  landing_page_id: string
  visitor_id?: string
  session_id?: string
  data?: Record<string, any>
}

export async function POST(request: NextRequest) {
  try {
    const body: AnalyticsEvent = await request.json()
    
    const { type, landing_page_id, visitor_id, session_id, data } = body
    
    if (!type || !landing_page_id) {
      return NextResponse.json(
        { error: 'Missing required fields: type and landing_page_id' },
        { status: 400 }
      )
    }

    // Require session_id for page views to prevent uncontrolled creation
    if (type === 'page_view' && !session_id) {
      return NextResponse.json(
        { error: 'session_id is required for page_view tracking' },
        { status: 400 }
      )
    }

    const supabase = createClient()
    let result

    switch (type) {
      case 'page_view':
        // Check if we already have a page view for this session in the last 5 minutes to prevent duplicates
        const recentPageView = await supabase
          .schema('analytics')
          .from('page_views')
          .select('id')
          .eq('landing_page_id', landing_page_id)
          .eq('session_id', session_id || '')
          .gte('created_at', new Date(Date.now() - 300000).toISOString()) // Last 5 minutes
          .single()

        if (recentPageView.data) {
          // Return success but don't insert duplicate
          result = { data: recentPageView.data, error: null }
        } else {
          result = await supabase
            .schema('analytics')
            .from('page_views')
            .insert({
              id: crypto.randomUUID(),
              landing_page_id,
              viewer_id: visitor_id || crypto.randomUUID(),
              created_at: new Date().toISOString(),
              referrer: data?.referrer || null,
              user_agent: data?.user_agent || null,
              url: data?.url || null,
              session_id: session_id // No fallback - required field
            })
        }
        break

      case 'cta_click':
        result = await supabase
          .schema('analytics')
          .from('cta_clicks')
          .insert({
            id: crypto.randomUUID(),
            landing_page_id,
            created_at: new Date().toISOString(),
            cta_text: data?.cta_text || '',
            cta_position: data?.cta_position || '',
            referrer: data?.referrer || null,
            user_agent: data?.user_agent || null,
            url: data?.url || null,
            session_id: session_id || crypto.randomUUID()
          })
        break

      case 'unique_visitor':
        result = await supabase
          .schema('analytics')
          .from('unique_visitors')
          .upsert({
            landing_page_id,
            visitor_id: visitor_id || crypto.randomUUID(),
            first_visit: new Date().toISOString(),
            last_visit: new Date().toISOString(),
            visit_count: 1,
            referrer: data?.referrer || null,
            user_agent: data?.user_agent || null,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'landing_page_id,visitor_id'
          })
        break

      case 'page_time':
        result = await supabase
          .schema('analytics')
          .from('page_sessions')
          .insert({
            landing_page_id,
            visitor_id: visitor_id || crypto.randomUUID(),
            session_id: session_id || crypto.randomUUID(),
            session_start: data?.session_start || new Date().toISOString(),
            session_end: data?.session_end || new Date().toISOString(),
            duration_seconds: data?.duration_seconds || 0,
            referrer: data?.referrer || null,
            user_agent: data?.user_agent || null,
            created_at: new Date().toISOString()
          })
        break

      case 'section_view':
        result = await supabase
          .schema('analytics')
          .from('section_view_events')
          .insert({
            id: crypto.randomUUID(),
            landing_page_id,
            section: data?.section || '',
            index: data?.index || 0,
            session_id: session_id || crypto.randomUUID(),
            created_at: new Date().toISOString()
          })
        break

      default:
        return NextResponse.json(
          { error: 'Unknown event type' },
          { status: 400 }
        )
    }

    if (result.error) {
      return NextResponse.json(
        { error: 'Failed to save analytics data', details: result.error },
        { status: 500 }
      )
    }

    
    return NextResponse.json({ 
      success: true, 
      message: `${type} tracked successfully`,
      data: result.data 
    })

  } catch (error) {
    console.error('Analytics tracking error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error },
      { status: 500 }
    )
  }
}