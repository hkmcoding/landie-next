import { http, HttpResponse } from 'msw'

export const handlers = [
  // Supabase Auth API mocks
  http.post('http://127.0.0.1:54321/auth/v1/signup', () => {
    return HttpResponse.json({
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        created_at: new Date().toISOString()
      },
      session: {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token'
      }
    })
  }),

  http.post('http://127.0.0.1:54321/auth/v1/token', () => {
    return HttpResponse.json({
      user: {
        id: 'test-user-id',
        email: 'test@example.com'
      },
      session: {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token'
      }
    })
  }),

  // Supabase REST API mocks
  http.get('http://127.0.0.1:54321/rest/v1/user_profiles', () => {
    return HttpResponse.json([
      {
        user_id: 'test-user-id',
        business_name: 'Test Business',
        bio: 'Test bio',
        subscription_tier: 'free'
      }
    ])
  }),

  http.get('http://127.0.0.1:54321/rest/v1/services', () => {
    return HttpResponse.json([
      {
        id: '1',
        user_id: 'test-user-id',
        title: 'Test Service 1',
        description: 'Test description 1',
        order_index: 0
      },
      {
        id: '2',
        user_id: 'test-user-id',
        title: 'Test Service 2',
        description: 'Test description 2',
        order_index: 1
      }
    ])
  })
]