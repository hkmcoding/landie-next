/**
 * Copy text to clipboard with fallback support
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    // Try modern clipboard API first
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    // Fallback for older browsers or non-secure contexts
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    const result = document.execCommand('copy');
    document.body.removeChild(textArea);
    
    return result;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}

/**
 * Generate the embed HTML snippet for a user profile
 */
export function generateEmbedSnippet(username: string, name: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://landie.co';
  
  return `<a href="${baseUrl}/${username}" title="${name} – Landie">
  <img src="${baseUrl}/${username}/opengraph-image" width="600" style="border-radius:12px" />
</a>`;
}

/**
 * Copy embed snippet to clipboard
 */
export async function copyEmbedSnippet(username: string, name: string): Promise<boolean> {
  const snippet = generateEmbedSnippet(username, name);
  return copyToClipboard(snippet);
} 