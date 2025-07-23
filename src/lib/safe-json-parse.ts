/**
 * Safely parse JSON responses, handling server errors gracefully
 */
export async function safeJsonParse<T>(response: Response): Promise<T | null> {
  try {
    // Check if response is ok first
    if (!response.ok) {
      console.error(`HTTP error! status: ${response.status}`);
      return null;
    }

    // Check content type
    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      console.error('Response is not JSON:', contentType);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('JSON parsing failed:', error);
    return null;
  }
}