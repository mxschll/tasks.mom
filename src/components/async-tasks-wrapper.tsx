"use client";

import { useState, useEffect } from "react";
import { DAVCalendar } from "tsdav";
import { VTODO, ensureDatesAreObjects } from "@/lib/vtodo";
import { TaskManager } from "@/lib/task-manager";
import { 
  getCachedTasks, 
  setCachedTasks, 
  tasksHaveChanged, 
  isCacheStale,
  getCachedCalendars,
  setCachedCalendars,
  calendarsHaveChanged,
  isCalendarCacheStale,
  getCachedSelectedCalendar,
  setCachedSelectedCalendar,
  clearAllCache
} from "@/lib/task-cache";
import AddTaskForm from "./add-task-form";
import TaskList from "./task-list";
import CalendarDropdown from "./calendar-dropdown";
import { Button } from "./ui/button";

export default function AsyncTasksWrapper() {
  const [calendars, setCalendars] = useState<DAVCalendar[]>([]);
  const [taskManager, setTaskManager] = useState<TaskManager>(new TaskManager());
  const [selectedCalendar, setSelectedCalendar] = useState<DAVCalendar | null>(null);
  const [isSyncingCalendars, setIsSyncingCalendars] = useState(false);
  const [isSyncingTasks, setIsSyncingTasks] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update page title based on selected calendar
  useEffect(() => {
    if (selectedCalendar) {
      const calendarName = typeof selectedCalendar.displayName === 'string' 
        ? selectedCalendar.displayName 
        : 'Calendar';
      document.title = `tasks.mom - ${calendarName}`;
    } else {
      document.title = 'tasks.mom';
    }
  }, [selectedCalendar]);

  // Load cached calendars immediately and sync in background
  useEffect(() => {
    // Load cached calendars immediately (no loading spinner!)
    const cachedCalendars = getCachedCalendars();
    if (cachedCalendars && cachedCalendars.length > 0) {
      setCalendars(cachedCalendars);
      
      // Restore selected calendar from local cache
      const cachedSelectedUrl = getCachedSelectedCalendar();
      if (cachedSelectedUrl) {
        const cachedSelected = cachedCalendars.find(cal => cal.url === cachedSelectedUrl);
        if (cachedSelected) {
          setSelectedCalendar(cachedSelected);
        }
      } else if (cachedCalendars.length > 0) {
        // Auto-select first calendar if no cached selection
        setSelectedCalendar(cachedCalendars[0]);
        setCachedSelectedCalendar(cachedCalendars[0].url);
      }
    }

    // Start background sync for calendars
    const syncCalendars = async () => {
      try {
        setIsSyncingCalendars(true);
        setError(null);
        
        // Fetch calendars and server-side selection in parallel
        const [calendarsResponse, selectionResponse] = await Promise.all([
          fetch('/api/calendars'),
          fetch('/api/calendar-selection')
        ]);

        if (!calendarsResponse.ok) {
          throw new Error('Failed to fetch calendars');
        }

        const calendarsData = await calendarsResponse.json();
        const freshCalendars = calendarsData.calendars;
        
        // Only update UI if calendars have actually changed
        const currentCalendars = cachedCalendars || [];
        if (calendarsHaveChanged(currentCalendars, freshCalendars)) {
          setCalendars(freshCalendars);
        }  

        // Always update cache with fresh data
        setCachedCalendars(freshCalendars);

        // Handle calendar selection - prefer server-side selection over cached
        let selectedCalendarFromServer = null;
        if (selectionResponse.ok) {
          const selectionData = await selectionResponse.json();
          if (selectionData.selectedCalendarUrl) {
            selectedCalendarFromServer = freshCalendars.find(
              (cal: DAVCalendar) => cal.url === selectionData.selectedCalendarUrl
            );
          }
        }

        // Update selected calendar based on priority:
        // 1. Server selection (most recent)
        // 2. Local cache (if server has none)
        // 3. First calendar (fallback)
        if (selectedCalendarFromServer) {
          setSelectedCalendar(selectedCalendarFromServer);
          setCachedSelectedCalendar(selectedCalendarFromServer.url);
        } else if (!cachedCalendars && freshCalendars.length > 0) {
          // Only auto-select if we had no cached calendars
          setSelectedCalendar(freshCalendars[0]);
          setCachedSelectedCalendar(freshCalendars[0].url);
        }
        
      } catch (error) {
        console.error("Failed to sync calendars:", error);
        // Only show error if we had no cached data to fall back on
        if (!cachedCalendars) {
          setError("Failed to load calendars. Please refresh the page.");
        }
      } finally {
        setIsSyncingCalendars(false);
      }
    };

    // Sync immediately if no cache or cache is stale, otherwise sync in background after a delay
    if (!cachedCalendars || isCalendarCacheStale()) {
      syncCalendars();
    } else {
      // Delay background sync to not interfere with UI interactions
      const timeoutId = setTimeout(syncCalendars, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, []);

  // Load cached tasks immediately and sync in background when calendar changes
  useEffect(() => {
    if (!selectedCalendar) return;

    // Load cached tasks immediately (no loading spinner!)
    const cachedTasks = getCachedTasks(selectedCalendar.url);
    if (cachedTasks) {
      setTaskManager(new TaskManager(cachedTasks));
    } else {
      // Only show empty state if no cache - we'll load from server
      setTaskManager(new TaskManager([]));
    }

    // Start background sync
    const syncTasks = async () => {
      try {
        setIsSyncingTasks(true);
        setError(null);
        
        const response = await fetch(`/api/tasks/fetch?calendarUrl=${encodeURIComponent(selectedCalendar.url)}`);
        if (!response.ok) {
          throw new Error('Failed to fetch tasks');
        }
        
        const data = await response.json();
        const freshTasks = data.tasks.map(ensureDatesAreObjects);
        
        // Only update UI if tasks have actually changed
        const currentTasks = cachedTasks || [];
        if (tasksHaveChanged(currentTasks, freshTasks)) {
          setTaskManager(new TaskManager(freshTasks));
        }

        // Always update cache with fresh data
        setCachedTasks(selectedCalendar.url, freshTasks);
        
      } catch (error) {
        console.error("Failed to sync tasks:", error);
        // Only show error if we had no cached data to fall back on
        if (!cachedTasks) {
          setError("Failed to load tasks for this calendar.");
        }
      } finally {
        setIsSyncingTasks(false);
      }
    };

    // Sync immediately if no cache or cache is stale, otherwise sync in background after a delay
    if (!cachedTasks || isCacheStale(selectedCalendar.url)) {
      syncTasks();
    } else {
      // Delay background sync to not interfere with UI interactions
      const timeoutId = setTimeout(syncTasks, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [selectedCalendar]);

  const handleCalendarChange = async (calendar: DAVCalendar) => {
    setSelectedCalendar(calendar);
    
    // Cache selection locally immediately
    setCachedSelectedCalendar(calendar.url);
    
    // Save calendar selection to session (background)
    try {
      await fetch('/api/calendar-selection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ calendarUrl: calendar.url }),
      });
    } catch (error) {
      console.error("Failed to save calendar selection:", error);
    }
  };

  const addTaskOptimistically = (task: VTODO) => {
    setTaskManager(prevManager => {
      const newManager = prevManager.addTask(task);
      const newTasks = Array.from(newManager.getTasks());
      // Cache optimistic update immediately
      if (selectedCalendar) {
        setCachedTasks(selectedCalendar.url, newTasks);
      }
      return newManager;
    });
  };

  const removeTaskOptimistically = (taskUid: string) => {
    setTaskManager(prevManager => {
      const newManager = prevManager.removeTask(taskUid);
      const newTasks = Array.from(newManager.getTasks());
      // Cache optimistic update immediately
      if (selectedCalendar) {
        setCachedTasks(selectedCalendar.url, newTasks);
      }
      return newManager;
    });
  };

  const replaceOptimisticTask = (tempUid: string, realTask: VTODO) => {
    console.log('Replacing optimistic task:', tempUid, 'with real task:', realTask.uid);
    setTaskManager(prevManager => {
      const newManager = prevManager.replaceOptimisticTask(tempUid, realTask);
      const newTasks = Array.from(newManager.getTasks());
      // Cache the update immediately
      if (selectedCalendar) {
        setCachedTasks(selectedCalendar.url, newTasks);
      }
      return newManager;
    });
  };

  const updateTaskOptimistically = (updatedTask: VTODO) => {
    setTaskManager(prevManager => {
      const newManager = prevManager.updateTask(updatedTask);
      const newTasks = Array.from(newManager.getTasks());
      // Cache optimistic update immediately
      if (selectedCalendar) {
        setCachedTasks(selectedCalendar.url, newTasks);
      }
      return newManager;
    });
  };

  const revertTaskUpdate = (originalTask: VTODO) => {
    setTaskManager(prevManager => {
      const newManager = prevManager.updateTask(originalTask);
      const newTasks = Array.from(newManager.getTasks());
      // Cache the revert immediately
      if (selectedCalendar) {
        setCachedTasks(selectedCalendar.url, newTasks);
      }
      return newManager;
    });
  };

  const deleteTaskOptimistically = (taskUid: string) => {
    setTaskManager(prevManager => {
      const newManager = prevManager.removeTask(taskUid);
      const newTasks = Array.from(newManager.getTasks());
      // Cache optimistic delete immediately
      if (selectedCalendar) {
        setCachedTasks(selectedCalendar.url, newTasks);
      }
      return newManager;
    });
  };

  const revertTaskDelete = (deletedTask: VTODO) => {
    setTaskManager(prevManager => {
      const newManager = prevManager.addTask(deletedTask);
      const newTasks = Array.from(newManager.getTasks());
      // Cache the revert immediately
      if (selectedCalendar) {
        setCachedTasks(selectedCalendar.url, newTasks);
      }
      return newManager;
    });
  };

  const refreshTasks = async () => {
    if (!selectedCalendar) return;
    
    try {
      setIsSyncingTasks(true);
      const response = await fetch(`/api/tasks/fetch?calendarUrl=${encodeURIComponent(selectedCalendar.url)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch tasks');
      }
      
      const data = await response.json();
      const tasksWithDates = data.tasks.map(ensureDatesAreObjects);
      setTaskManager(new TaskManager(tasksWithDates));
      setCachedTasks(selectedCalendar.url, tasksWithDates);
    } catch (error) {
      console.error("Failed to refresh tasks:", error);
    } finally {
      setIsSyncingTasks(false);
    }
  };

  const handleSignOut = async () => {
    try {
      // Clear all local cache first
      clearAllCache();
      
      // Call logout API to clear server session
      const response = await fetch('/api/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Logout failed');
      }

      // Redirect to login page
      window.location.href = '/login';
    } catch (error) {
      console.error('Failed to sign out:', error);
      // Even if API fails, clear cache and redirect
      clearAllCache();
      window.location.href = '/login';
    }
  };

  // Show error state if we have an error and no cached data
  if (error && calendars.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto p-4">
          <div className="text-center py-12">
            <div className="text-red-600 mb-4">{error}</div>
            <Button onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto p-4">
        <div className="flex items-center justify-between mb-8 pt-4">
          <div className="flex items-center gap-3">
            {calendars.length > 0 ? (
              <CalendarDropdown 
                calendars={calendars}
                selectedCalendar={selectedCalendar || undefined}
                onCalendarChange={handleCalendarChange}
              />
            ) : (
              <div className="h-12 w-48 bg-gray-200 animate-pulse rounded"></div>
            )}
            {(isSyncingCalendars || isSyncingTasks) && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <div className="animate-spin h-3 w-3 border border-gray-400 border-t-transparent rounded-full"></div>
                <span>Syncing...</span>
              </div>
            )}
          </div>
          <Button variant="ghost" className="text-gray-600" onClick={handleSignOut}>
            Sign Out
          </Button>
        </div>

        {selectedCalendar && (
          <>
            <AddTaskForm 
              selectedCalendarUrl={selectedCalendar.url}
              onTaskAdded={refreshTasks}
              onTaskAddedOptimistically={addTaskOptimistically}
              onTaskAddFailed={removeTaskOptimistically}
              onTaskReplaceOptimistic={replaceOptimisticTask}
            />
            
            <TaskList 
              taskManager={taskManager}
              onTaskUpdated={updateTaskOptimistically}
              onTaskUpdateFailed={revertTaskUpdate}
              onTaskDeleted={deleteTaskOptimistically}
              onTaskDeleteFailed={revertTaskDelete}
              calendarUrl={selectedCalendar.url}
            />
          </>
        )}

        {!selectedCalendar && calendars.length > 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600">Select a calendar to view tasks</p>
          </div>
        )}
      </div>
    </div>
  );
} 