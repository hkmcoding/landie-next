import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { OnboardingData } from '@/lib/supabase/onboarding-service';

const VALID_TYPES = ['bio', 'services', 'highlights'] as const;
type AiType = typeof VALID_TYPES[number];

interface AiRequestBody {
  userId: string;
  onboarding: OnboardingData;
  count?: number;
}

interface AiSuggestion {
  user_id: string;
  type: AiType;
  suggestion: string | Array<{ title: string; description: string }>;
  created_at?: string;
}

// Mock suggestions for when OpenAI is not available
const getMockSuggestion = (type: AiType, onboardingData: OnboardingData, count?: number) => {
  const additionalInfo = onboardingData.additionalInfo || '';
  const name = onboardingData.name || 'Professional';
  
  switch (type) {
    case 'bio':
      return `I'm a Certified Strength Coach with 10+ years of experience helping clients achieve their fitness goals. I'm passionate about creating personalized training programs that focus on sustainable lifestyle changes. ${additionalInfo ? `I specialize in ${additionalInfo.toLowerCase()}.` : ''} I'm ready to help you transform your health and build lasting habits.`;
    
    case 'services':
      const serviceOptions = [
        {
          title: '1-on-1 Personal Training',
          description: 'Customized workout sessions designed specifically for your goals, fitness level, and schedule. Includes form correction, progressive programming, and ongoing support.'
        },
        {
          title: 'Nutrition Coaching',
          description: 'Comprehensive nutrition guidance with meal planning, macro tracking, and sustainable eating strategies that fit your lifestyle and preferences.'
        },
        {
          title: 'Group Training Sessions',
          description: 'Small group training sessions that combine personalized attention with the motivation of working out with others. Cost-effective and community-focused.'
        }
      ];
      return serviceOptions.slice(0, count || 3);
    
    case 'highlights':
      const highlightOptions = [
        {
          title: 'Years of Experience',
          description: 'Extensive experience helping clients achieve their fitness goals through personalized training and coaching approaches.'
        },
        {
          title: 'Client Success Stories',
          description: 'Successfully guided numerous clients through their fitness transformations, from weight loss to strength building and athletic performance.'
        },
        {
          title: 'Specialized Training Approach',
          description: 'Developed personalized training methodologies that focus on sustainable lifestyle changes and long-term results.'
        }
      ];
      return highlightOptions.slice(0, count || 3);
    
    default:
      return 'Professional fitness expert ready to help you achieve your goals.';
  }
};

const generateOpenAISuggestion = async (type: AiType, onboardingData: OnboardingData, count?: number) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.log('OpenAI API key not found, using mock suggestion');
    return getMockSuggestion(type, onboardingData, count);
  }

  const { name, additionalInfo, headline, subheadline, services, highlights } = onboardingData;
  
  let context = `Name: ${name || 'Not provided'}
Headline: ${headline || 'Not provided'}
Subheadline: ${subheadline || 'Not provided'}
Additional Info: ${additionalInfo || 'Not provided'}`;

  // Add existing services/highlights context for better AI generation
  if (type === 'services' && services?.length > 0) {
    const existingServices = services
      .filter(s => s.title.trim() || s.description.trim())
      .map((s, i) => `Service ${i + 1}: ${s.title || '[No title]'} - ${s.description || '[No description]'}`)
      .join('\n');
    if (existingServices) {
      context += `\n\nExisting Services Input:\n${existingServices}`;
    }
  }
  
  if (type === 'highlights' && highlights?.length > 0) {
    const existingHighlights = highlights
      .filter(h => h.title.trim() || h.description.trim())
      .map((h, i) => `Highlight ${i + 1}: ${h.title || '[No title]'} - ${h.description || '[No description]'}`)
      .join('\n');
    if (existingHighlights) {
      context += `\n\nExisting Highlights Input:\n${existingHighlights}`;
    }
  }

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
      const serviceCount = count || 3;
      const hasExistingServices = services?.some(s => s.title.trim() || s.description.trim());
      
      if (hasExistingServices) {
        prompt = `Improve and complete ${serviceCount} fitness service${serviceCount > 1 ? 's' : ''} for a trainer based on this information:
${context}

IMPORTANT: Use the existing services input as a foundation. For services with titles but no descriptions, keep the EXACT same title and write compelling descriptions that directly relate to and explain that specific service. For services with partial information, enhance and improve them while keeping existing content. If creating new services, make them complement the existing ones. Focus on different aspects like personal training, group classes, nutrition, etc. Base everything on the provided information and avoid making up specific credentials not mentioned.`;
      } else {
        prompt = `Create ${serviceCount} fitness service${serviceCount > 1 ? 's' : ''} for a trainer based on this information:
${context}

Generate ${serviceCount} distinct fitness service${serviceCount > 1 ? 's' : ''} they might offer. Each service should have a title and description. Focus on different aspects like personal training, group classes, nutrition, etc. Base the services on the provided information and avoid making up specific credentials not mentioned.`;
      }
      
      responseFormat = `Return a JSON array with exactly ${serviceCount} object${serviceCount > 1 ? 's' : ''} containing "title" and "description" fields only. No additional text or formatting.`;
      break;

    case 'highlights':
      const highlightCount = count || 3;
      const hasExistingHighlights = highlights?.some(h => h.title.trim() || h.description.trim());
      
      if (hasExistingHighlights) {
        prompt = `Improve and complete ${highlightCount} professional highlight${highlightCount > 1 ? 's' : ''} for a fitness trainer based on this information:
${context}

IMPORTANT: Use the existing highlights input as a foundation. For highlights with titles but no descriptions, keep the EXACT same title and write compelling descriptions that directly relate to and explain that specific title. For highlights with partial information, enhance and improve them while keeping existing content. If creating new highlights, make them complement the existing ones. Only use information provided above - do not make up specific certifications, credentials, or achievements not mentioned. Focus on experience, specialties, or accomplishments that can be inferred from the provided information.`;
      } else {
        prompt = `Create ${highlightCount} professional highlight${highlightCount > 1 ? 's' : ''} for a fitness trainer based on this information:
${context}

Generate ${highlightCount} key achievement${highlightCount > 1 ? 's' : ''}, experience, or credential${highlightCount > 1 ? 's' : ''} that would build credibility. Only use information provided above - do not make up specific certifications, credentials, or achievements not mentioned. Focus on general experience, specialties, or accomplishments that can be inferred from the provided information.`;
      }
      
      responseFormat = `Return a JSON array with exactly ${highlightCount} object${highlightCount > 1 ? 's' : ''} containing "title" and "description" fields only. No additional text or formatting.`;
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
      return getMockSuggestion(type, onboardingData, count);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();

    if (!content) {
      console.error('No content in OpenAI response');
      return getMockSuggestion(type, onboardingData, count);
    }

    // For bio, return the string directly
    if (type === 'bio') {
      return content;
    }

    // For services and highlights, parse JSON
    try {
      // Clean up the content - remove markdown code blocks if present
      let cleanContent = content.trim();
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      const parsed = JSON.parse(cleanContent);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch (parseError) {
      console.error('Failed to parse OpenAI JSON response:', parseError);
      console.error('Raw content:', content);
    }

    // Fallback to mock if parsing fails
    return getMockSuggestion(type, onboardingData, count);

  } catch (error) {
    console.error('OpenAI API call failed:', error);
    return getMockSuggestion(type, onboardingData, count);
  }
};

const saveAiSuggestion = async (suggestion: AiSuggestion) => {
  try {
    const supabase = createClient();
    
    // Check if supabase client was created successfully
    if (!supabase) {
      console.error('Failed to create Supabase client');
      return;
    }
    
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

    const { userId, onboarding, count } = body;

    // Validate required fields
    if (!userId || !onboarding) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, onboarding' },
        { status: 400 }
      );
    }

    // Generate AI suggestion
    const suggestion = await generateOpenAISuggestion(type as AiType, onboarding, count);

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