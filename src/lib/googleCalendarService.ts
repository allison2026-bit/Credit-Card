import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

export const SCOPES = ['https://www.googleapis.com/auth/calendar.events'];

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => provider.addScope(scope));

// In-memory access token cache (never stored in localStorage/sessionStorage)
let isSigningIn = false;
let cachedAccessToken: string | null = null;

export const initCalendarAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleCalendarSignIn = async (): Promise<{
  user: User;
  accessToken: string;
} | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('無法取得 Google Calendar 存取權杖，請重試。');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getCalendarAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const calendarLogout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};

export interface CalendarAlertDateSpec {
  month: number; // 1-12
  day: number; // 1-31
  label: string; // e.g., '每年 10月1日'
  eventTitleSuffix?: string;
}

export interface CardCalendarAlertRule {
  id: string;
  trackerId: string;
  cardName: string;
  shortCardName: string;
  benefitTitle: string;
  shortLabel: string;
  scheduleSummary: string;
  description: string;
  dates: CalendarAlertDateSpec[];
}

export const PRESET_CALENDAR_ALERTS: CardCalendarAlertRule[] = [
  {
    id: 'alert-csp-hotel',
    trackerId: 'trk-csp-hotel',
    cardName: 'Chase Sapphire Preferred',
    shortCardName: 'CSP',
    benefitTitle: 'Chase Travel 飯店折抵 $100',
    shortLabel: 'CSP 飯店 $100',
    scheduleSummary: '10/1',
    description:
      'Chase Sapphire Preferred — Chase Travel 飯店折抵 $100（每年 10/1 提醒）',
    dates: [{ month: 10, day: 1, label: '10/1' }],
  },
  {
    id: 'alert-ihg-ua',
    trackerId: 'trk-ihg-ua',
    cardName: 'Chase IHG One Rewards Premier',
    shortCardName: 'IHG',
    benefitTitle: 'United TravelBank $25',
    shortLabel: 'IHG UA $25',
    scheduleSummary: '1/5 · 7/5',
    description:
      'Chase IHG One Rewards Premier — United TravelBank Cash $25（每年 1/5 & 7/5 提醒）',
    dates: [
      {
        month: 1,
        day: 5,
        label: '1/5 ($25)',
        eventTitleSuffix: '上半年 $25',
      },
      {
        month: 7,
        day: 5,
        label: '7/5 ($25)',
        eventTitleSuffix: '下半年 $25',
      },
    ],
  },
  {
    id: 'alert-marriott-air',
    trackerId: 'trk-marriott-air',
    cardName: 'Chase Marriott Bonvoy Boundless',
    shortCardName: 'Marriott',
    benefitTitle: '航空滿 $250 折 $50',
    shortLabel: 'Marriott 航空 $50',
    scheduleSummary: '1/5 · 7/5',
    description:
      'Chase Marriott Bonvoy Boundless — 航空每半年滿 $250 折 $50（每年 1/5 & 7/5 提醒）',
    dates: [
      {
        month: 1,
        day: 5,
        label: '1/5 ($50)',
        eventTitleSuffix: '上半年 $50',
      },
      {
        month: 7,
        day: 5,
        label: '7/5 ($50)',
        eventTitleSuffix: '下半年 $50',
      },
    ],
  },
  {
    id: 'alert-marriott-fna',
    trackerId: 'trk-marriott-fna',
    cardName: 'Chase Marriott Bonvoy Boundless',
    shortCardName: 'Marriott',
    benefitTitle: '周年 35k 免房券',
    shortLabel: 'Marriott 35k 房券',
    scheduleSummary: '3/1',
    description:
      'Chase Marriott Bonvoy Boundless — 周年 35k 免房券（每年 3/1 提醒）',
    dates: [{ month: 3, day: 1, label: '3/1' }],
  },
  {
    id: 'alert-ihg-fna',
    trackerId: 'trk-ihg-fna',
    cardName: 'Chase IHG One Rewards Premier',
    shortCardName: 'IHG',
    benefitTitle: '周年 40k 免房券',
    shortLabel: 'IHG 40k 房券',
    scheduleSummary: '9/1',
    description:
      'Chase IHG One Rewards Premier — 周年 40k 免房券（每年 9/1 提醒）',
    dates: [{ month: 9, day: 1, label: '9/1' }],
  },
  {
    id: 'alert-hyatt-fna',
    trackerId: 'trk-hyatt-fna1',
    cardName: 'Chase World of Hyatt Visa',
    shortCardName: 'Hyatt',
    benefitTitle: '周年 Cat 1-4 免房券',
    shortLabel: 'Hyatt 房券',
    scheduleSummary: '11/1',
    description:
      'Chase World of Hyatt Visa — 周年 Cat 1–4 免房券（每年 11/1 提醒）',
    dates: [{ month: 11, day: 1, label: '11/1' }],
  },
];

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/**
 * Computes the next occurrence date (YYYY-MM-DD) and exclusive end date (+1 day)
 * based on the reference date (defaults to 2026-09-29).
 */
export function getNextOccurrenceDates(
  month: number,
  day: number,
  referenceDateStr = '2026-09-29'
): { startDate: string; endDate: string; year: number } {
  const [refY, refM, refD] = referenceDateStr.split('-').map(Number);
  const baseYear = refY || 2026;
  const isPastInBaseYear =
    month < (refM || 9) || (month === (refM || 9) && day < (refD || 29));
  const targetYear = isPastInBaseYear ? baseYear + 1 : baseYear;

  const startDate = `${targetYear}-${pad2(month)}-${pad2(day)}`;
  const nextDayObj = new Date(Date.UTC(targetYear, month - 1, day + 1));
  const endDate = `${nextDayObj.getUTCFullYear()}-${pad2(
    nextDayObj.getUTCMonth() + 1
  )}-${pad2(nextDayObj.getUTCDate())}`;

  return { startDate, endDate, year: targetYear };
}

export interface CreatedCalendarEventResult {
  ruleId: string;
  eventId: string;
  summary: string;
  htmlLink: string;
  startDate: string;
}

export async function createGoogleCalendarAlertEvents(
  accessToken: string,
  rules: CardCalendarAlertRule[],
  referenceDateStr = '2026-09-29'
): Promise<CreatedCalendarEventResult[]> {
  const results: CreatedCalendarEventResult[] = [];

  for (const rule of rules) {
    for (const d of rule.dates) {
      const { startDate, endDate } = getNextOccurrenceDates(
        d.month,
        d.day,
        referenceDateStr
      );
      const summary = d.eventTitleSuffix
        ? `[信用卡提醒] ${rule.cardName} — ${rule.benefitTitle} (${d.eventTitleSuffix})`
        : `[信用卡提醒] ${rule.cardName} — ${rule.benefitTitle}`;

      const body = {
        summary,
        description: rule.description,
        start: { date: startDate },
        end: { date: endDate },
        recurrence: ['RRULE:FREQ=YEARLY'],
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 9 * 60 }, // 9 hours before midnight = 3pm day before, or morning notification
            { method: 'email', minutes: 24 * 60 }, // 1 day before email alert
          ],
        },
      };

      const res = await fetch(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        }
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(
          errData?.error?.message || `Google Calendar API 錯誤 (${res.status})`
        );
      }

      const created = await res.json();
      results.push({
        ruleId: rule.id,
        eventId: created.id,
        summary,
        htmlLink: created.htmlLink || 'https://calendar.google.com',
        startDate,
      });
    }
  }

  return results;
}
