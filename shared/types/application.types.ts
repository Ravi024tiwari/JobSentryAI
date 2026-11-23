// Manual Job Application Tracking Statuses (Mandatory Requirement)
export const APPLICATION_STATUSES = [
  'SAVED',
  'APPLIED',
  'ASSESSMENT_COMPLETED',
  'INTERVIEW_SCHEDULED',
  'INTERVIEW_COMPLETED',
  'SELECTED',
  'OFFER_RECEIVED',
  'JOINED',
  'REJECTED',
  'NO_RESPONSE',
  'WITHDRAWN',
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

// Event Source
export const EVENT_SOURCES = ['MANUAL', 'SYSTEM', 'STUDENT_NOTE'] as const;
export type EventSource = (typeof EVENT_SOURCES)[number];

// Single Application Event History Item
export interface ApplicationTimelineEvent {
  id: string;
  applicationId: string;
  previousStatus: ApplicationStatus | null;
  newStatus: ApplicationStatus;
  note?: string;
  source: EventSource;
  occurredAt: string;
}
