import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { OnboardingData } from '@/lib/supabase/onboarding-service';

const VALID_TYPES = ['bio', 'services', 'highlights'] as const;
type AiType = typeof VALID_TYPES[number];

interface AiRequestBody {
  userId: string;
  onboarding: OnboardingData;
}

interface AiSuggestion {
  user_id: string;
  type: AiType;
  suggestion: string | Array<{ title: string; description: string }>;
  created_at?: string;
}

// Mock suggestions for when OpenAI is not available
const getMockSuggestion = (type: AiType, onboardingData: OnboardingData) => {
  const additionalInfo = onboardingData.additionalInfo || '';
  const name = onboardingData.name || 'Professional';
  
  switch (type) {
    case 'bio':
      return `I'm a Certified Strength Coach with 10+ years of experience helping clients achieve their fitness goals. I'm passionate about creating personalized training programs that focus on sustainable lifestyle changes. ${additionalInfo ? `I specialize in ${additionalInfo.toLowerCase()}.` : ''} I'm ready to help you transform your health and build lasting habits.`;
    
    case 'services':
      return [
        {
          title: '1-on-1 Personal Training',
          description: 'Customized workout sessions designed specifically for your goals, fitness level, and schedule. Includes form correction, progressive programming, and ongoing support.'
        },
        {
          title: 'Nutrition Coaching',
          description: 'Comprehensive nutrition guidance with meal planning, macro tracking, and sustainable eating strategies that fit your lifestyle and preferences.'
        },
        {
          title: 'Group Fitness Classes',
          description: 'High-energy group sessions combining strength training and cardio in a motivating, community-focused environment. All fitness levels welcome.'
        }
      ];
    
    case 'highlights':
      return [
        {
          title: 'NASM Certified Personal Trainer',
          description: 'National Academy of Sports Medicine certified with continuing education in corrective exercise and performance enhancement.'
        },
        {
          title: '500+ Client Transformations',
          description: 'Successfully helped over 500 clients achieve their fitness goals, from weight loss to strength building and athletic performance.'
        },
        {
          title: 'Nutrition Specialist Certification',
          description: 'Advanced certification in sports nutrition and dietary coaching, enabling comprehensive wellness support beyond just exercise.'
        }
      ];
    
    default:
      return 'Professional fitness expert ready to help you achieve your goals.';
  }
};

const generateOpenAISuggestion = async (type: AiType, onboardingData: OnboardingData) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.log('OpenAI API key not found, using mock suggestion');
    return getMockSuggestion(type, onboardingData);
  }

  const { name, additionalInfo, headline, subheadline } = onboardingData;
  const context = `Name: ${name || 'Not provided'}
Headline: ${headline || 'Not provided'}
Subheadline: ${subheadline || 'Not provided'}
Additional Info: ${additionalInfo || 'Not provided'}`;

  let prompt = '';
  let responseFormat = '';

  switch (type) {
    case 'bio':
      prompt = `Create a professional bio for a fitness trainer based on this information:
${context}

Write a compelling 2-3 sentence bio in first person that highlights their expertise, passion, and what makes them unique. Focus on fitness, wellness, and client transformation. Be authentic and engaging. Use "I" statements throughout.`;
      responseFormat = 'Return only the bio text in first person, no quotes or additional formatting.';
      break;

    case 'services':
      prompt = `Create 3 fitness services for a trainer based on this information:
${context}

Generate 3 distinct fitness services they might offer. Each service should have a title and description. Focus on different aspects like personal training, group classes, nutrition, etc.`;
      responseFormat = 'Return a JSON array with objects containing "title" and "description" fields only. No additional text or formatting.';
      break;

    case 'highlights':
      prompt = `Create 3 professional highlights for a fitness trainer based on this information:
${context}

Generate 3 key achievements, certifications,或 credentials that would build credibility. Focus on certifications, experience, specialties, or notable accomplishments.`;
      responseFormat = 'Return a JSON array with objects containing "title" and "description" fields only. No additional text or formatting.';
      break;
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a professional copywriter specializing in fitness and wellness marketing. Create compelling, authentic content.'
          },
          {
            role: 'user',
            content: `${prompt}\n\n${responseFormat}`
          }
        ],
        max_tokens: type === 'bio' ? 150 : 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      console.error('OpenAI API error:', response.status, response.statusText);
      return getMockSuggestion(type, onboardingData);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();

    if (!content) {
      console.error('No content in OpenAI response');
      return getMockSuggestion(type, onboardingData);
    }

    // For bio, return the string directly
    if (type === 'bio') {
      return content;
    }

    // For services and highlights, parse JSON
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch (parseError) {
      console.error('Failed to parse OpenAI JSON response:', parseError);
    }

    // Fallback to mock if parsing fails
    return getMockSuggestion(type, onboardingData);

  } catch (error) {
    console.error('OpenAI API call failed:', error);
    return getMockSuggestion(type, onboardingData);
  }
};

const saveAiSuggestion = async (suggestion: AiSuggestion) => {
  try {
    const supabase = createClient();
    
    const { error } = await supabase
      .from('ai_suggestions')
      .upsert({
        user_id: suggestion.user_id,
        type: suggestion.type,
        suggestion: JSON.stringify(suggestion.suggestion),
        created_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,type'
      });

    if (error) {
      console.error('Failed to save AI suggestion:', error);
    }
  } catch (error) {
    console.error('Database error saving AI suggestion:', error);
  }
};

export async function POST(
  request: NextRequest,
  { params }: { params: { type: string } }
) {
  try {
    const { type } = params;
    
    // Validate type parameter
    if (!VALID_TYPES.includes(type as AiType)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${VALID_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // Parse request body
    let body: AiRequestBody;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const { userId, onboarding } = body;

    // Validate required fields
    if (!userId || !onboarding) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, onboarding' },
        { status: 400 }
      );
    }

    // Generate AI suggestion
    const suggestion = await generateOpenAISuggestion(type as AiType, onboarding);

    // Save to database only for real users (not dev users)
    if (!userId.startsWith('DEV_')) {
      await saveAiSuggestion({
        user_id: userId,
        type: type as AiType,
        suggestion,
      });
    } else {
      console.log(`DEV MODE: Skipping database save for user ${userId}`);
    }

    return NextResponse.json({ suggestion });

  } catch (error) {
    console.error('AI API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Deny all other HTTP methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}