import { VTODO, ensureDatesAreObjects } from './vtodo';
import { DAVCalendar } from 'tsdav';

const CACHE_PREFIX = 'tasks_cache_';
const CACHE_TIMESTAMP_PREFIX = 'tasks_timestamp_';
const CALENDARS_CACHE_KEY = 'calendars_cache';
const CALENDARS_TIMESTAMP_KEY = 'calendars_timestamp';
const SELECTED_CALENDAR_KEY = 'selected_calendar_cache';
const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

export interface TaskCache {
  tasks: VTODO[];
  timestamp: number;
}

function getCacheKey(calendarUrl: string): string {
  // Create a safe cache key from calendar URL
  return CACHE_PREFIX + btoa(calendarUrl).replace(/[/+=]/g, '_');
}

function getTimestampKey(calendarUrl: string): string {
  return CACHE_TIMESTAMP_PREFIX + btoa(calendarUrl).replace(/[/+=]/g, '_');
}

// ========== TASK CACHING ==========

export function getCachedTasks(calendarUrl: string): VTODO[] | null {
  try {
    const cacheKey = getCacheKey(calendarUrl);
    const timestampKey = getTimestampKey(calendarUrl);
    
    const cachedData = localStorage.getItem(cacheKey);
    const timestamp = localStorage.getItem(timestampKey);
    
    if (!cachedData || !timestamp) {
      return null;
    }

    const cacheAge = Date.now() - parseInt(timestamp);
    
    // Return cached data regardless of age - we'll sync in background
    // But log if it's getting old
    if (cacheAge > CACHE_EXPIRY_MS) {
      console.log(`Task cache is ${Math.round(cacheAge / 1000 / 60)} minutes old, will sync in background`);
    }

    const tasks = JSON.parse(cachedData);
    
    // Ensure dates are proper Date objects
    return tasks.map(ensureDatesAreObjects);
  } catch (error) {
    console.error('Failed to load cached tasks:', error);
    return null;
  }
}

export function setCachedTasks(calendarUrl: string, tasks: VTODO[]): void {
  try {
    const cacheKey = getCacheKey(calendarUrl);
    const timestampKey = getTimestampKey(calendarUrl);
    
    localStorage.setItem(cacheKey, JSON.stringify(tasks));
    localStorage.setItem(timestampKey, Date.now().toString());
    
  } catch (error) {
    console.error('Failed to cache tasks:', error);
  }
}

export function clearCachedTasks(calendarUrl: string): void {
  try {
    const cacheKey = getCacheKey(calendarUrl);
    const timestampKey = getTimestampKey(calendarUrl);
    
    localStorage.removeItem(cacheKey);
    localStorage.removeItem(timestampKey);
  } catch (error) {
    console.error('Failed to clear cached tasks:', error);
  }
}

export function isCacheStale(calendarUrl: string): boolean {
  try {
    const timestampKey = getTimestampKey(calendarUrl);
    const timestamp = localStorage.getItem(timestampKey);
    
    if (!timestamp) {
      return true;
    }

    const cacheAge = Date.now() - parseInt(timestamp);
    return cacheAge > CACHE_EXPIRY_MS;
  } catch (error) {
    return true;
  }
}

// ========== CALENDAR CACHING ==========

export function getCachedCalendars(): DAVCalendar[] | null {
  try {
    const cachedData = localStorage.getItem(CALENDARS_CACHE_KEY);
    const timestamp = localStorage.getItem(CALENDARS_TIMESTAMP_KEY);
    
    if (!cachedData || !timestamp) {
      return null;
    }

    return JSON.parse(cachedData);
  } catch (error) {
    console.error('Failed to load cached calendars:', error);
    return null;
  }
}

export function setCachedCalendars(calendars: DAVCalendar[]): void {
  try {
    localStorage.setItem(CALENDARS_CACHE_KEY, JSON.stringify(calendars));
    localStorage.setItem(CALENDARS_TIMESTAMP_KEY, Date.now().toString());
    
    console.log(`Cached ${calendars.length} calendars`);
  } catch (error) {
    console.error('Failed to cache calendars:', error);
  }
}

export function isCalendarCacheStale(): boolean {
  try {
    const timestamp = localStorage.getItem(CALENDARS_TIMESTAMP_KEY);
    
    if (!timestamp) {
      return true;
    }

    const cacheAge = Date.now() - parseInt(timestamp);
    return cacheAge > CACHE_EXPIRY_MS;
  } catch (error) {
    return true;
  }
}

export function getCachedSelectedCalendar(): string | null {
  try {
    return localStorage.getItem(SELECTED_CALENDAR_KEY);
  } catch (error) {
    console.error('Failed to load cached selected calendar:', error);
    return null;
  }
}

export function setCachedSelectedCalendar(calendarUrl: string): void {
  try {
    localStorage.setItem(SELECTED_CALENDAR_KEY, calendarUrl);
  } catch (error) {
    console.error('Failed to cache selected calendar:', error);
  }
}

// ========== UTILITY FUNCTIONS ==========

export function clearAllCache(): void {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(CACHE_PREFIX) || 
          key.startsWith(CACHE_TIMESTAMP_PREFIX) ||
          key === CALENDARS_CACHE_KEY ||
          key === CALENDARS_TIMESTAMP_KEY ||
          key === SELECTED_CALENDAR_KEY) {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.error('Failed to clear cache:', error);
  }
}

// Utility to compare task arrays and detect changes
export function tasksHaveChanged(oldTasks: VTODO[], newTasks: VTODO[]): boolean {
  if (oldTasks.length !== newTasks.length) {
    return true;
  }

  // Create maps for efficient comparison
  const oldTaskMap = new Map(oldTasks.map(task => [task.uid, task]));
  const newTaskMap = new Map(newTasks.map(task => [task.uid, task]));

  // Check if any tasks are missing or different
  for (const [uid, newTask] of newTaskMap) {
    const oldTask = oldTaskMap.get(uid);
    if (!oldTask) {
      return true; // New task added
    }

    // Compare key properties that might change
    if (
      oldTask.summary !== newTask.summary ||
      oldTask.description !== newTask.description ||
      oldTask.status !== newTask.status ||
      oldTask.priority !== newTask.priority ||
      (oldTask.dueDate && newTask.dueDate && 
        (oldTask.dueDate instanceof Date ? oldTask.dueDate : new Date(oldTask.dueDate)).getTime() !== 
        (newTask.dueDate instanceof Date ? newTask.dueDate : new Date(newTask.dueDate)).getTime()) ||
      (!!oldTask.dueDate !== !!newTask.dueDate) ||
      (oldTask.lastModified && newTask.lastModified && 
        (oldTask.lastModified instanceof Date ? oldTask.lastModified : new Date(oldTask.lastModified)).getTime() !== 
        (newTask.lastModified instanceof Date ? newTask.lastModified : new Date(newTask.lastModified)).getTime()) ||
      (!!oldTask.lastModified !== !!newTask.lastModified)
    ) {
      return true;
    }
  }

  // Check if any old tasks are missing
  for (const uid of oldTaskMap.keys()) {
    if (!newTaskMap.has(uid)) {
      return true; // Task was deleted
    }
  }

  return false;
}

// Utility to compare calendar arrays and detect changes
export function calendarsHaveChanged(oldCalendars: DAVCalendar[], newCalendars: DAVCalendar[]): boolean {
  if (oldCalendars.length !== newCalendars.length) {
    return true;
  }

  // Create maps for efficient comparison
  const oldCalendarMap = new Map(oldCalendars.map(cal => [cal.url, cal]));
  const newCalendarMap = new Map(newCalendars.map(cal => [cal.url, cal]));

  // Check if any calendars are missing or different
  for (const [url, newCalendar] of newCalendarMap) {
    const oldCalendar = oldCalendarMap.get(url);
    if (!oldCalendar) {
      return true; // New calendar added
    }

    // Compare key properties that might change
    if (
      oldCalendar.displayName !== newCalendar.displayName ||
      oldCalendar.description !== newCalendar.description ||
      oldCalendar.timezone !== newCalendar.timezone
    ) {
      return true;
    }
  }

  // Check if any old calendars are missing
  for (const url of oldCalendarMap.keys()) {
    if (!newCalendarMap.has(url)) {
      return true; // Calendar was deleted
    }
  }

  return false;
} 