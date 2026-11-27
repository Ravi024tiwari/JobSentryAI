import dns from 'dns/promises';
import net from 'net';

// Blacklisted Private IP Ranges (CIDR representation)
const PRIVATE_IP_PATTERNS = [
  /^127\./,                         // Loopback (127.0.0.0/8)
  /^10\./,                          // Class A Private (10.0.0.0/8)
  /^192\.168\./,                    // Class C Private (192.168.0.0/16)
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // Class B Private (172.16.0.0/12)
  /^169\.254\./,                    // Link-Local & AWS/Cloud Metadata (169.254.0.0/16)
  /^0\./,                           // Current Network (0.0.0.0/8)
  /^::1$/,                          // IPv6 Loopback
  /^f[cd][0-9a-f]{2}:/i,            // IPv6 Unique Local
  /^fe80:/i,                        // IPv6 Link-Local
];

/**
 * Check if an IP address belongs to private/internal networks
 */
export function isPrivateIpAddress(ip: string): boolean {
  return PRIVATE_IP_PATTERNS.some((pattern) => pattern.test(ip));
}

/**
 * Validates a user-provided URL against SSRF attacks.
 * Throws an error if the URL is dangerous or points to private infrastructure.
 */
export async function validateUrlSafety(inputUrl: string): Promise<{ safeUrl: string; hostname: string }> {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(inputUrl);
  } catch {
    throw new Error('Invalid URL format');
  }

  // 1. Strict Protocol Check (Only HTTP and HTTPS allowed)
  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    throw new Error(`Forbidden protocol: ${parsedUrl.protocol}. Only http: and https: are allowed.`);
  }

  const hostname = parsedUrl.hostname.toLowerCase();

  // 2. Reject obvious dangerous hostnames
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname === 'metadata.google.internal' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local')
  ) {
    throw new Error('Access to local/internal hosts is strictly forbidden.');
  }

  // 3. DNS Pre-Resolution Check (Resolve domain to its actual physical IP)
  try {
    const lookupResult = await dns.lookup(hostname, { all: true });

    if (!lookupResult || lookupResult.length === 0) {
      throw new Error(`Domain could not be resolved: ${hostname}`);
    }

    // Inspect every IP address returned by DNS
    for (const record of lookupResult) {
      const resolvedIp = record.address;

      if (!net.isIP(resolvedIp)) {
        throw new Error(`Invalid IP address resolved: ${resolvedIp}`);
      }

      if (isPrivateIpAddress(resolvedIp)) {
        throw new Error(
          `SSRF Security Alert: The domain "${hostname}" resolved to a forbidden private IP (${resolvedIp}).`
        );
      }
    }
  } catch (error: any) {
    // If it's our own security error, rethrow it
    if (error.message?.includes('SSRF') || error.message?.includes('forbidden')) {
      throw error;
    }
    throw new Error(`Failed to verify host safety: ${error.message || 'DNS lookup failed'}`);
  }

  return { safeUrl: parsedUrl.toString(), hostname };
}

/**
 * Safely fetches HTML content with size limits and strict timeout
 */
export async function safeFetchHtml(url: string, timeoutMs = 8000): Promise<string> {
  // Step 1: Pre-flight security verification
  const { safeUrl } = await validateUrlSafety(url);

  // Step 2: AbortController for strict timeout
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(safeUrl, {
      method: 'GET',
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
        'Sec-Ch-Ua': '"Chromium";v="124", "Google Chrome";v="124"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
      },
    });

    clearTimeout(timer);

    if (!response.ok) {
      if (response.status === 403) {
        let domain = 'this website';
        try {
          domain = new URL(url).hostname;
        } catch {}
        throw new Error(
          `${domain} blocked automated server access (HTTP 403 Forbidden). Major job aggregators like Glassdoor, LinkedIn, Indeed, and Naukri use Cloudflare anti-bot firewalls to block web crawlers. Tip: Use the "Manual Form / Text" mode to paste the job details directly!`
        );
      }
      throw new Error(`Failed to fetch job page. HTTP Status: ${response.status}`);
    }

    // Check content type (Must be HTML or text, not binary/exe/zip)
    const contentType = response.headers.get('content-type') || '';
    if (
      !contentType.includes('text/html') &&
      !contentType.includes('text/plain') &&
      !contentType.includes('application/xhtml')
    ) {
      throw new Error(`Unsupported content type: ${contentType}. Only text/html pages can be analyzed.`);
    }

    // Max 2MB Size Limit Protection
    const text = await response.text();
    if (text.length > 2 * 1024 * 1024) {
      throw new Error('Job page content is too large (exceeds 2MB limit).');
    }

    return text;
  } catch (error: any) {
    clearTimeout(timer);
    if (error.name === 'AbortError') {
      throw new Error('Request timed out while connecting to the job page (8s limit).');
    }
    throw error;
  }
}
