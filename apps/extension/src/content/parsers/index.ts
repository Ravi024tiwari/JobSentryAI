export interface ExtractedJobData {
  companyName: string;
  jobTitle: string;
  description: string;
  salary?: string;
  location?: string;
  jobUrl: string;
  platform: 'GLASSDOOR' | 'LINKEDIN' | 'INDEED' | 'NAUKRI' | 'INTERNSHALA' | 'GENERIC';
}

function cleanText(text?: string | null): string {
  if (!text) return '';
  return text.replace(/\s+/g, ' ').trim();
}

function stripHtmlTags(html?: string | null): string {
  if (!html) return '';
  try {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return cleanText(temp.textContent || temp.innerText || '');
  } catch {
    return cleanText(html.replace(/<[^>]+>/g, ' '));
  }
}

function parseJsonLdSalary(baseSalary: any): string | undefined {
  if (!baseSalary) return undefined;
  if (typeof baseSalary === 'string') return cleanText(baseSalary);

  const currency = baseSalary.currency || '$';
  const val = baseSalary.value;

  if (typeof val === 'number') {
    const unit = baseSalary.unitText ? ` / ${baseSalary.unitText.toLowerCase()}` : '';
    return `${currency} ${val.toLocaleString()}${unit}`;
  }

  if (typeof val === 'object' && val !== null) {
    const min = val.minValue !== undefined ? val.minValue.toLocaleString() : '';
    const max = val.maxValue !== undefined ? val.maxValue.toLocaleString() : '';
    const unit =
      val.unitText || baseSalary.unitText
        ? ` / ${(val.unitText || baseSalary.unitText).toLowerCase()}`
        : '';
    if (min && max) return `${currency} ${min} - ${max}${unit}`;
    if (min) return `${currency} ${min}+${unit}`;
    if (max) return `Up to ${currency} ${max}${unit}`;
    if (val.value) return `${currency} ${val.value.toLocaleString()}${unit}`;
  }

  return undefined;
}

function parseJsonLdLocation(jobLocation: any): string | undefined {
  if (!jobLocation) return undefined;
  if (typeof jobLocation === 'string') return cleanText(jobLocation);

  const addr = jobLocation.address || jobLocation;
  if (typeof addr === 'string') return cleanText(addr);

  if (typeof addr === 'object' && addr !== null) {
    const parts = [
      addr.addressLocality,
      addr.addressRegion,
      addr.addressCountry,
    ].filter(Boolean);
    if (parts.length > 0) return parts.join(', ');
  }

  return undefined;
}

/**
 * 1. Glassdoor Parser
 */
export function parseGlassdoor(): ExtractedJobData | null {
  // On Glassdoor, search pages feature a split layout:
  // Left: Feed list of job cards
  // Right: Active / selected Job Details pane
  // Always inspect the active details pane first to avoid picking up the first job in the feed list.
  const detailPane =
    document.querySelector('article[class*="JobDetails"]') ||
    document.querySelector('div[class*="JobDetails_jobDetailsContainer"]') ||
    document.querySelector('div[class*="JobDetails"]') ||
    document.querySelector('div[class*="jobDetailsContainer"]') ||
    document.querySelector('section[class*="JobDetails"]') ||
    document.querySelector('[data-test="job-details"]') ||
    document.querySelector('[data-test="job-view"]') ||
    document.querySelector('div[class*="JobView"]') ||
    document.querySelector('main section') ||
    document.querySelector('main');

  let companyEl = detailPane
    ? detailPane.querySelector('[data-test="employer-name"]') ||
      detailPane.querySelector('[class*="EmployerProfile"]') ||
      detailPane.querySelector('.EmployerProfile_profileContainer') ||
      detailPane.querySelector('[class*="EmployerName"]') ||
      detailPane.querySelector('h4') ||
      detailPane.querySelector('div[class*="employer"]')
    : null;

  let titleEl = detailPane
    ? detailPane.querySelector('h1[class*="heading"]') ||
      detailPane.querySelector('h1[class*="JobViewTitle"]') ||
      detailPane.querySelector('h1') ||
      detailPane.querySelector('[data-test="job-title"]') ||
      detailPane.querySelector('h2[class*="heading"]')
    : null;

  let descEl = detailPane
    ? detailPane.querySelector('[data-test="jobDescriptionText"]') ||
      detailPane.querySelector('.JobDetails_jobDescription') ||
      detailPane.querySelector('[class*="JobDetails_jobDescription"]') ||
      detailPane.querySelector('.desc') ||
      detailPane.querySelector('#JobDescriptionContainer') ||
      detailPane.querySelector('[class*="jobDescriptionContent"]')
    : null;

  let salaryEl = detailPane
    ? detailPane.querySelector('[data-test="detailSalary"]') ||
      detailPane.querySelector('[class*="SalaryEstimate"]') ||
      detailPane.querySelector('[data-test="job-price"]')
    : null;

  // Fallback to document level only if detail pane was missing elements
  if (!companyEl) {
    companyEl =
      document.querySelector('[data-test="employer-name"]') ||
      document.querySelector('[class*="EmployerName"]') ||
      document.querySelector('.EmployerProfile_profileContainer') ||
      document.querySelector('div[class*="employer"]') ||
      document.querySelector('.css-16nw49e') ||
      document.querySelector('[data-brandviews*="employer"]');
  }

  if (!titleEl) {
    titleEl =
      document.querySelector('[data-test="job-title"]') ||
      document.querySelector('h1[class*="JobViewTitle"]') ||
      document.querySelector('h1.heading_Heading') ||
      document.querySelector('h1') ||
      document.querySelector('h2[data-test="job-title"]');
  }

  if (!descEl) {
    descEl =
      document.querySelector('[data-test="jobDescriptionText"]') ||
      document.querySelector('.JobDetails_jobDescription') ||
      document.querySelector('[class*="JobDetails_jobDescription"]') ||
      document.querySelector('.desc') ||
      document.querySelector('#JobDescriptionContainer') ||
      document.querySelector('[class*="jobDescriptionContent"]');
  }

  if (!salaryEl) {
    salaryEl =
      document.querySelector('[data-test="detailSalary"]') ||
      document.querySelector('[class*="SalaryEstimate"]') ||
      document.querySelector('[data-test="job-price"]');
  }

  let companyName = cleanText(companyEl?.textContent);
  let jobTitle = cleanText(titleEl?.textContent);
  let description = cleanText(descEl?.textContent);

  // Fallback to meta tags or document title if DOM is dynamic
  if (!jobTitle || !companyName) {
    const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content');
    if (ogTitle && ogTitle.includes(' at ')) {
      const parts = ogTitle.split(' at ');
      if (!jobTitle) jobTitle = parts[0].trim();
      if (!companyName) companyName = parts[1].replace(/\|.*/, '').trim();
    } else if (document.title.includes(' at ')) {
      const parts = document.title.split(' at ');
      if (!jobTitle) jobTitle = parts[0].trim();
      if (!companyName) companyName = parts[1].replace(/\|.*/, '').replace(/-.*/, '').trim();
    }
  }

  // URL slug fallback if needed
  if (!jobTitle || !companyName) {
    const path = window.location.pathname;
    const match = path.match(/\/job-listing\/([^-]+(?:-[^-]+)*)-JV_/);
    if (match && match[1]) {
      const slugWords = match[1].split('-');
      if (!jobTitle) jobTitle = slugWords.slice(0, 3).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      if (!companyName) companyName = slugWords.slice(3).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || 'Company on Glassdoor';
    }
  }

  if (!description) {
    description = document.body ? document.body.innerText.slice(0, 3000) : '';
  }

  return {
    companyName: companyName || 'Company on Glassdoor',
    jobTitle: jobTitle || 'Job Opening',
    description: description || 'Glassdoor Job Posting Details',
    salary: cleanText(salaryEl?.textContent) || undefined,
    jobUrl: window.location.href,
    platform: 'GLASSDOOR',
  };
}

export function parseJobDetailsFromFreeText(
  text: string,
  defaultCompany = 'Hiring Recruiter'
): {
  jobTitle: string;
  companyName: string;
  salary?: string;
  location?: string;
} {
  let jobTitle = '';
  let companyName = defaultCompany;
  let salary: string | undefined = undefined;
  let location: string | undefined = undefined;

  // 1. Position / Role regex: e.g. "Position: DevOps Engineer - Azure (FTE)"
  const titleMatch = text.match(
    /(?:Position|Role|Designation|Job Title|Hiring for|Looking for|Opening for)\s*[:\-–]\s*([^\n\r,;]+)/i
  );
  if (titleMatch && titleMatch[1]) {
    jobTitle = titleMatch[1].trim();
  }

  // 2. Company regex: e.g. "VBR Consultancy is hiring" or "at [Company]"
  const companyHiringMatch = text.match(
    /([A-Za-z0-9\s&]{2,40}?(?:\bConsultancy\b|\bTechnologies\b|\bSolutions\b|\bServices\b|\bInfotech\b|\bPvt Ltd\b|\bLtd\b|\bInc\b|\bLLC\b|\bGroup\b|\bCorporation\b|\bCorp\b))\s+(?:is hiring|is looking|welcomes|invites)/i
  );
  if (companyHiringMatch && companyHiringMatch[1]) {
    companyName = companyHiringMatch[1].trim();
  } else {
    const atCompanyMatch = text.match(
      /(?:at|with)\s+([A-Za-z0-9\s&]{2,30}?)(?:\s+for|\s+as|\s+in|\.|\n|$)/i
    );
    if (
      atCompanyMatch &&
      atCompanyMatch[1] &&
      !['the', 'our', 'a', 'an', 'client', 'clients'].includes(
        atCompanyMatch[1].toLowerCase().trim()
      )
    ) {
      companyName = atCompanyMatch[1].trim();
    }
  }

  // 3. Salary / CTC regex: e.g. "Salary: Up to ₹13 LPA"
  const salaryMatch = text.match(
    /(?:Salary|CTC|Package|Compensation|Stipend)\s*[:\-–]\s*([^\n\r]+)/i
  );
  if (salaryMatch && salaryMatch[1]) {
    salary = salaryMatch[1].trim();
  }

  // 4. Location regex: e.g. "Locations: Hyderabad | Gurgaon | Noida"
  const locMatch = text.match(
    /(?:Locations?|Job Location|Work Location)\s*[:\-–]\s*([^\n\r]+)/i
  );
  if (locMatch && locMatch[1]) {
    location = locMatch[1].trim();
  }

  // Fallback for title if no "Position:" label found
  if (!jobTitle) {
    const hiringWordMatch = text.match(
      /(?:hiring|looking for)\s+(?:experienced\s+|urgent\s+)?([A-Za-z\s\-\/\+]{3,35}?(?:Engineer|Developer|Designer|Architect|Lead|Intern|Manager|Analyst|Consultant|Executive|Associate|Specialist))/i
    );
    if (hiringWordMatch && hiringWordMatch[1]) {
      jobTitle = hiringWordMatch[1].trim();
    }
  }

  return {
    jobTitle: jobTitle || 'Job Opening',
    companyName: companyName || defaultCompany,
    salary,
    location,
  };
}

/**
 * 2. LinkedIn Parser (Supports both Official Job Posts & Feed/Recruiter Updates)
 */
export function parseLinkedIn(): ExtractedJobData | null {
  // A. Official LinkedIn Job Posting Page (/jobs/view/...)
  const companyEl =
    document.querySelector('.job-details-jobs-unified-top-card__company-name a') ||
    document.querySelector('.jobs-unified-top-card__company-name') ||
    document.querySelector('[data-tracking-control-name="public_jobs_topcard-org-name"]') ||
    document.querySelector('.topcard__org-name-link') ||
    document.querySelector('.job-details-jobs-unified-top-card__primary-description a');

  const titleEl =
    document.querySelector('.job-details-jobs-unified-top-card__job-title h1') ||
    document.querySelector('h1.top-card-layout__title') ||
    document.querySelector('.jobs-unified-top-card__job-title') ||
    document.querySelector('h1.t-24') ||
    document.querySelector('h1');

  const descEl =
    document.querySelector('#job-details') ||
    document.querySelector('.jobs-description__content') ||
    document.querySelector('.show-more-less-html__markup') ||
    document.querySelector('.jobs-box__html-content');

  const companyName = cleanText(companyEl?.textContent);
  const jobTitle = cleanText(titleEl?.textContent);
  const description = cleanText(descEl?.textContent);

  if (companyName && jobTitle && description) {
    return {
      companyName,
      jobTitle,
      description,
      jobUrl: window.location.href,
      platform: 'LINKEDIN',
    };
  }

  // B. LinkedIn Feed Post / Recruiter Update (as seen in user feed)
  // Check if user has selected text
  const selectedText = window.getSelection()?.toString().trim();
  if (selectedText && selectedText.length > 25) {
    const details = parseJobDetailsFromFreeText(selectedText, 'LinkedIn Recruiter');
    return {
      companyName: details.companyName,
      jobTitle: details.jobTitle,
      description: selectedText,
      salary: details.salary,
      location: details.location,
      jobUrl: window.location.href,
      platform: 'LINKEDIN',
    };
  }

  // Find posts in the DOM
  const posts = Array.from(
    document.querySelectorAll<HTMLElement>(
      'div.feed-shared-update-v2, div[data-urn*="activity"], div.feed-shared-update, .occludable-update, article'
    )
  );

  let targetPost: HTMLElement | null = null;
  const viewportCenter = window.innerHeight / 2;

  // Find post closest to center of viewport
  let minDistance = Infinity;
  for (const post of posts) {
    const rect = post.getBoundingClientRect();
    if (rect.bottom > 0 && rect.top < window.innerHeight) {
      const postCenter = rect.top + rect.height / 2;
      const distance = Math.abs(postCenter - viewportCenter);
      if (distance < minDistance) {
        minDistance = distance;
        targetPost = post;
      }
    }
  }

  if (!targetPost && posts.length > 0) {
    targetPost = posts[0];
  }

  if (targetPost) {
    // Extract author / recruiter name
    const actorEl =
      targetPost.querySelector('.update-components-actor__name span[aria-hidden="true"]') ||
      targetPost.querySelector('.update-components-actor__name') ||
      targetPost.querySelector('.feed-shared-actor__name') ||
      targetPost.querySelector('.update-components-actor__title');

    // Extract text content of post
    const textEl =
      targetPost.querySelector('.feed-shared-update-v2__description-wrapper') ||
      targetPost.querySelector('.update-components-text') ||
      targetPost.querySelector('.feed-shared-text') ||
      targetPost.querySelector('.feed-shared-update-v2__description') ||
      targetPost.querySelector('[class*="update-components-text"]');

    const postText = cleanText(textEl?.textContent || targetPost.innerText);
    const actorName = cleanText(actorEl?.textContent) || 'LinkedIn Recruiter';

    if (postText.length > 30) {
      const details = parseJobDetailsFromFreeText(postText, actorName);
      return {
        companyName: details.companyName,
        jobTitle: details.jobTitle,
        description: postText.slice(0, 4000),
        salary: details.salary,
        location: details.location,
        jobUrl: window.location.href,
        platform: 'LINKEDIN',
      };
    }
  }

  // Fallback: If on linkedin.com and page has text, extract from whole visible text
  const fullText = document.body ? cleanText(document.body.innerText) : '';
  if (
    fullText.includes('HIRING') ||
    fullText.includes('Position:') ||
    fullText.includes('DevOps') ||
    fullText.includes('Engineer')
  ) {
    const details = parseJobDetailsFromFreeText(fullText, 'Company on LinkedIn');
    return {
      companyName: details.companyName,
      jobTitle: details.jobTitle,
      description: fullText.slice(0, 3000),
      salary: details.salary,
      location: details.location,
      jobUrl: window.location.href,
      platform: 'LINKEDIN',
    };
  }

  return null;
}

/**
 * 3. Indeed Parser
 */
export function parseIndeed(): ExtractedJobData | null {
  const companyEl =
    document.querySelector('[data-company-name="true"]') ||
    document.querySelector('[data-testid="inlineHeader-companyName"]') ||
    document.querySelector('.companyName');

  const titleEl =
    document.querySelector('h1[data-testid="jobsearch-JobInfoHeader-title"]') ||
    document.querySelector('h1.jobsearch-JobInfoHeader-title') ||
    document.querySelector('h1');

  const descEl =
    document.querySelector('#jobDescriptionText') ||
    document.querySelector('.jobsearch-jobDescriptionText');

  const companyName = cleanText(companyEl?.textContent);
  const jobTitle = cleanText(titleEl?.textContent);
  const description = cleanText(descEl?.textContent);

  if (!companyName && !jobTitle && !description) return null;

  return {
    companyName: companyName || 'Company on Indeed',
    jobTitle: jobTitle || 'Job Opening',
    description: description || document.body.innerText.slice(0, 3000),
    jobUrl: window.location.href,
    platform: 'INDEED',
  };
}

/**
 * 4. Naukri Parser
 */
export function parseNaukri(): ExtractedJobData | null {
  const companyEl =
    document.querySelector('[class*="company-name"]') ||
    document.querySelector('a.comp-name') ||
    document.querySelector('.comp-name');

  const titleEl =
    document.querySelector('[class*="jd-header-title"]') ||
    document.querySelector('h1.title') ||
    document.querySelector('h1');

  const descEl =
    document.querySelector('[class*="JobDescription"]') ||
    document.querySelector('.job-desc') ||
    document.querySelector('.dang-inner-html');

  const companyName = cleanText(companyEl?.textContent);
  const jobTitle = cleanText(titleEl?.textContent);
  const description = cleanText(descEl?.textContent);

  if (!companyName && !jobTitle && !description) return null;

  return {
    companyName: companyName || 'Company on Naukri',
    jobTitle: jobTitle || 'Job Opening',
    description: description || document.body.innerText.slice(0, 3000),
    jobUrl: window.location.href,
    platform: 'NAUKRI',
  };
}

/**
 * 5. Universal JSON-LD Schema.org JobPosting Parser (The Production-Grade Core)
 * Reads <script type="application/ld+json"> directly. Layout-proof and independent of CSS classes!
 */
export function parseJsonLdJobPosting(): ExtractedJobData | null {
  const scripts = document.querySelectorAll('script[type="application/ld+json"]');
  if (!scripts || scripts.length === 0) return null;

  for (const script of Array.from(scripts)) {
    try {
      const raw = script.textContent?.trim();
      if (!raw) continue;
      const parsed = JSON.parse(raw);

      // Extract all candidate objects from single, array, or @graph structure
      const candidates: any[] = [];
      if (Array.isArray(parsed)) {
        candidates.push(...parsed);
      } else if (parsed && typeof parsed === 'object') {
        if (Array.isArray(parsed['@graph'])) {
          candidates.push(...parsed['@graph']);
        } else {
          candidates.push(parsed);
        }
      }

      for (const item of candidates) {
        if (!item || typeof item !== 'object') continue;

        const type = item['@type'];
        const isJob =
          type === 'JobPosting' ||
          (Array.isArray(type) && type.includes('JobPosting')) ||
          item.hiringOrganization !== undefined;

        if (!isJob) continue;

        const title = cleanText(item.title || item.name);
        const org = item.hiringOrganization;
        const companyName = cleanText(
          typeof org === 'string' ? org : org?.name || org?.legalName
        );
        const description = stripHtmlTags(item.description);
        const salary = parseJsonLdSalary(item.baseSalary || item.estimatedSalary);
        const location = parseJsonLdLocation(
          item.jobLocation || item.applicantLocationRequirements
        );
        const jobUrl = item.url || window.location.href;

        if (title && (companyName || description)) {
          // Detect platform from current hostname
          const host = window.location.hostname.toLowerCase();
          let platform: ExtractedJobData['platform'] = 'GENERIC';
          if (host.includes('glassdoor')) platform = 'GLASSDOOR';
          else if (host.includes('linkedin')) platform = 'LINKEDIN';
          else if (host.includes('indeed')) platform = 'INDEED';
          else if (host.includes('naukri')) platform = 'NAUKRI';
          else if (host.includes('internshala')) platform = 'INTERNSHALA';

          return {
            jobTitle: title,
            companyName: companyName || 'Hiring Employer',
            description: description || 'Job Posting Details',
            salary,
            location,
            jobUrl,
            platform,
          };
        }
      }
    } catch {}
  }

  return null;
}

/**
 * 6. OpenGraph & Meta Tag Parser
 */
export function parseSchemaOrOpenGraph(): ExtractedJobData | null {
  const jsonLd = parseJsonLdJobPosting();
  if (jsonLd) return jsonLd;

  // OpenGraph Fallback
  const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content');
  const ogSite = document.querySelector('meta[property="og:site_name"]')?.getAttribute('content');
  const ogDesc = document.querySelector('meta[property="og:description"]')?.getAttribute('content');

  if (ogTitle && ogDesc) {
    let cleanJobTitle = ogTitle;
    let cleanCompany = ogSite || 'Company';

    if (ogTitle.includes(' at ')) {
      const parts = ogTitle.split(' at ');
      cleanJobTitle = parts[0].trim();
      cleanCompany = parts[1].replace(/\|.*/, '').replace(/-.*/, '').trim();
    } else if (ogTitle.includes(' hiring ')) {
      const parts = ogTitle.split(' hiring ');
      cleanCompany = parts[0].trim();
      cleanJobTitle = parts[1].replace(/\|.*/, '').replace(/-.*/, '').trim();
    }

    return {
      companyName: cleanCompany,
      jobTitle: cleanJobTitle,
      description: cleanText(ogDesc),
      jobUrl: window.location.href,
      platform: 'GENERIC',
    };
  }

  return null;
}

/**
 * 7. Universal Semantic DOM Tree Walk (for unknown ATS portals e.g. Workday, Lever, Greenhouse)
 */
export function parseUniversalSemanticDOM(): ExtractedJobData | null {
  try {
    const mainContainer =
      document.querySelector('main, article, [role="main"], #main, .main') ||
      document.body;

    // 1. Title: Look for primary <h1> tag
    const h1 = mainContainer.querySelector('h1');
    const title = cleanText(h1?.textContent);
    if (!title || title.length < 3 || title.length > 150) return null;

    // 2. Company: Look near header, or logo alt, or meta author, or hostname
    let companyName = '';
    const logoImg = document.querySelector(
      'header img[alt], nav img[alt], [class*="logo"] img[alt]'
    ) as HTMLImageElement | null;
    if (logoImg?.alt && !logoImg.alt.toLowerCase().includes('logo')) {
      companyName = cleanText(logoImg.alt);
    }
    if (!companyName) {
      const metaAuthor = document
        .querySelector('meta[name="author"], meta[property="article:author"]')
        ?.getAttribute('content');
      if (metaAuthor) companyName = cleanText(metaAuthor);
    }
    if (!companyName) {
      const hostParts = window.location.hostname.split('.');
      companyName = hostParts[0].charAt(0).toUpperCase() + hostParts[0].slice(1);
    }

    // 3. Description: Largest block containing job keywords
    let bestBlock = '';
    const blocks = mainContainer.querySelectorAll('div, section, article');
    for (const b of Array.from(blocks)) {
      const text = cleanText(b.textContent);
      if (
        text.length > bestBlock.length &&
        text.length < 15000 &&
        /(?:requirements|qualifications|responsibilities|about the role|what you'll do|skills)/i.test(
          text
        )
      ) {
        bestBlock = text;
      }
    }

    return {
      jobTitle: title,
      companyName: companyName || 'Company',
      description: bestBlock || cleanText(mainContainer.textContent).slice(0, 3000),
      jobUrl: window.location.href,
      platform: 'GENERIC',
    };
  } catch {
    return null;
  }
}

/**
 * Master Router Parser: Prioritizes JSON-LD first, followed by Container-Scoped DOM Adapters!
 */
export function extractCurrentJobData(): ExtractedJobData | null {
  // Priority #0: Highlighted / selected text by user on ANY website!
  const selection = window.getSelection()?.toString().trim();
  if (selection && selection.length > 25) {
    const details = parseJobDetailsFromFreeText(selection, 'Selected Job Snippet');
    return {
      companyName: details.companyName,
      jobTitle: details.jobTitle,
      description: selection,
      salary: details.salary,
      location: details.location,
      jobUrl: window.location.href,
      platform: 'GENERIC',
    };
  }

  // Priority #1: Universal JSON-LD Standard Schema (The Layout-Proof Production Foundation)
  const jsonLdJob = parseJsonLdJobPosting();

  // Priority #2: Platform-specific scoped DOM adapters (active detail pane)
  const host = window.location.hostname.toLowerCase();
  let domJob: ExtractedJobData | null = null;

  if (host.includes('glassdoor')) {
    domJob = parseGlassdoor();
  } else if (host.includes('linkedin')) {
    domJob = parseLinkedIn();
  } else if (host.includes('indeed')) {
    domJob = parseIndeed();
  } else if (host.includes('naukri')) {
    domJob = parseNaukri();
  }

  // If JSON-LD provided structured data, merge with any DOM active refinements:
  if (jsonLdJob) {
    return {
      ...jsonLdJob,
      jobTitle:
        domJob?.jobTitle && domJob.jobTitle !== 'Job Opening'
          ? domJob.jobTitle
          : jsonLdJob.jobTitle,
      companyName:
        domJob?.companyName && !domJob.companyName.includes('Glassdoor')
          ? domJob.companyName
          : jsonLdJob.companyName,
      salary: domJob?.salary || jsonLdJob.salary,
      location: domJob?.location || jsonLdJob.location,
      description:
        jsonLdJob.description && jsonLdJob.description.length > 50
          ? jsonLdJob.description
          : domJob?.description || jsonLdJob.description,
      jobUrl: window.location.href,
    };
  }

  // If no JSON-LD on page, use DOM-based extraction
  if (domJob) {
    return domJob;
  }

  // Priority #3: OpenGraph & Meta Tags Fallback
  const ogJob = parseSchemaOrOpenGraph();
  if (ogJob) {
    return ogJob;
  }

  // Priority #4: Universal Semantic DOM Tree Walk (for unknown ATS portals)
  return parseUniversalSemanticDOM();
}
