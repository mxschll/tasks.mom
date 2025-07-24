import { VTODO } from './vtodo';

export type TaskFilter = "all" | "today" | "scheduled" | "completed";

export class TaskManager {
  private tasks: VTODO[];

  constructor(initialTasks: VTODO[] = []) {
    this.tasks = [...initialTasks];
  }

  // Get all tasks as a readonly array
  getTasks(): readonly VTODO[] {
    return this.tasks;
  }

  // Get filtered and sorted tasks for display
  getFilteredTasks(filter: TaskFilter): VTODO[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const isToday = (date: Date | string | undefined): boolean => {
      if (!date) return false;
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      const dateOnly = new Date(dateObj);
      dateOnly.setHours(0, 0, 0, 0);
      return dateOnly.getTime() === today.getTime();
    };

    const activeTasks = this.tasks.filter(
      (task) => task.status !== "COMPLETED" && task.status !== "CANCELLED"
    );

    switch (filter) {
      case "all":
        return this.sortActiveTasks(activeTasks);

      case "today":
        return this.sortActiveTasks(
          activeTasks.filter((task) => isToday(task.dueDate) || isToday(task.startDate))
        );

      case "scheduled":
        return activeTasks
          .filter(
            (task) =>
              (task.dueDate || task.startDate) &&
              !isToday(task.dueDate) &&
              !isToday(task.startDate)
          )
          .sort((a, b) => {
            const aDate = a.dueDate || a.startDate;
            const bDate = b.dueDate || b.startDate;
            if (!aDate && !bDate) return 0;
            if (!aDate) return 1;
            if (!bDate) return -1;
            
            const aDateObj = aDate instanceof Date ? aDate : new Date(aDate);
            const bDateObj = bDate instanceof Date ? bDate : new Date(bDate);
            
            return aDateObj.getTime() - bDateObj.getTime();
          });

      case "completed":
        return this.tasks
          .filter((task) => task.status === "COMPLETED")
          .sort((a, b) => {
            if (!a.completedDate && !b.completedDate) return 0;
            if (!a.completedDate) return 1;
            if (!b.completedDate) return -1;
            
            const aDateObj = a.completedDate instanceof Date ? a.completedDate : new Date(a.completedDate);
            const bDateObj = b.completedDate instanceof Date ? b.completedDate : new Date(b.completedDate);
            
            return bDateObj.getTime() - aDateObj.getTime();
          });

      default:
        return [];
    }
  }

  // Sort active tasks with a consistent strategy
  private sortActiveTasks(tasks: VTODO[]): VTODO[] {
    return tasks.sort((a, b) => {
      // First, sort by creation date
      if (a.created && b.created) {
        const aCreatedObj = a.created instanceof Date ? a.created : new Date(a.created);
        const bCreatedObj = b.created instanceof Date ? b.created : new Date(b.created);
        return bCreatedObj.getTime() - aCreatedObj.getTime();
      }

      // Then, sort by due date
      const aDate = a.dueDate;
      const bDate = b.dueDate;
      
      if (aDate && bDate) {
        const aDateObj = aDate instanceof Date ? aDate : new Date(aDate);
        const bDateObj = bDate instanceof Date ? bDate : new Date(bDate);
        const dateComparison = aDateObj.getTime() - bDateObj.getTime();
        if (dateComparison !== 0) return dateComparison;
      } else if (aDate && !bDate) {
        return -1; // Tasks with due dates come before tasks without
      } else if (!aDate && bDate) {
        return 1;
      }
      
      // Then sort by priority (higher priority = lower number = comes first)
      const aPriority = a.priority || 10;
      const bPriority = b.priority || 10;
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      
      // Finally, sort by creation date (newer first)
      if (a.created && b.created) {
        const aCreatedObj = a.created instanceof Date ? a.created : new Date(a.created);
        const bCreatedObj = b.created instanceof Date ? b.created : new Date(b.created);
        return bCreatedObj.getTime() - aCreatedObj.getTime();
      }
      
      return 0;
    });
  }

  // Find the correct insertion index for a new task
  private findInsertionIndex(task: VTODO): number {
    // For optimistic updates, we want to maintain the sort order
    // Find where this task should be inserted to maintain sorted order
    const activeTasks = this.tasks.filter(
      (t) => t.status !== "COMPLETED" && t.status !== "CANCELLED"
    );
    
    for (let i = 0; i < activeTasks.length; i++) {
      const currentTask = activeTasks[i];
      
      // Compare due dates first
      const taskDate = task.dueDate;
      const currentDate = currentTask.dueDate;
      
      if (taskDate && currentDate) {
        const taskDateObj = taskDate instanceof Date ? taskDate : new Date(taskDate);
        const currentDateObj = currentDate instanceof Date ? currentDate : new Date(currentDate);
        if (taskDateObj.getTime() < currentDateObj.getTime()) {
          // Find the actual index in the full tasks array
          return this.tasks.indexOf(currentTask);
        }
      } else if (taskDate && !currentDate) {
        // Task has due date, current doesn't - task should come first
        return this.tasks.indexOf(currentTask);
      } else if (!taskDate && currentDate) {
        // Task has no due date, current does - continue looking
        continue;
      }
      
      // If dates are equal or both undefined, compare priority
      const taskPriority = task.priority || 10;
      const currentPriority = currentTask.priority || 10;
      if (taskPriority < currentPriority) {
        return this.tasks.indexOf(currentTask);
      } else if (taskPriority > currentPriority) {
        continue;
      }
      
      // If priority is equal, compare creation date (newer first for same priority)
      if (task.created && currentTask.created) {
        const taskCreatedObj = task.created instanceof Date ? task.created : new Date(task.created);
        const currentCreatedObj = currentTask.created instanceof Date ? currentTask.created : new Date(currentTask.created);
        if (taskCreatedObj.getTime() > currentCreatedObj.getTime()) {
          return this.tasks.indexOf(currentTask);
        }
      }
    }
    
    // If we haven't found a position, check if we should insert after active tasks but before completed
    const completedTasks = this.tasks.filter(t => t.status === "COMPLETED");
    if (completedTasks.length > 0) {
      return this.tasks.indexOf(completedTasks[0]);
    }
    
    // Insert at the end
    return this.tasks.length;
  }

  // Add a task in the correct sorted position
  addTask(task: VTODO): TaskManager {
    const insertIndex = this.findInsertionIndex(task);
    const newTasks = [...this.tasks];
    newTasks.splice(insertIndex, 0, task);
    return new TaskManager(newTasks);
  }

  // Update a task (replace existing with same UID)
  updateTask(updatedTask: VTODO): TaskManager {
    const index = this.tasks.findIndex(t => t.uid === updatedTask.uid);
    if (index === -1) {
      // Task not found, add it instead
      return this.addTask(updatedTask);
    }

    const newTasks = [...this.tasks];
    newTasks[index] = updatedTask;
    
    // Check if the task needs to be moved due to changed sort criteria
    const currentPosition = index;
    const optimalPosition = this.findInsertionIndex(updatedTask);
    
    if (optimalPosition !== currentPosition && optimalPosition !== currentPosition + 1) {
      // Remove from current position
      newTasks.splice(currentPosition, 1);
      // Insert at optimal position (adjust for removal)
      const adjustedPosition = optimalPosition > currentPosition ? optimalPosition - 1 : optimalPosition;
      newTasks.splice(adjustedPosition, 0, updatedTask);
    }
    
    return new TaskManager(newTasks);
  }

  // Remove a task by UID
  removeTask(taskUid: string): TaskManager {
    const newTasks = this.tasks.filter(t => t.uid !== taskUid);
    return new TaskManager(newTasks);
  }

  // Replace an optimistic task with the real one (maintaining position if properties are similar)
  replaceOptimisticTask(tempUid: string, realTask: VTODO): TaskManager {
    const index = this.tasks.findIndex(t => t.uid === tempUid);
    if (index === -1) {
      // Optimistic task not found, add the real task
      return this.addTask(realTask);
    }

    const optimisticTask = this.tasks[index];
    const newTasks = [...this.tasks];
    
    // Check if key sorting properties changed
    const dueDateChanged = this.compareDates(optimisticTask.dueDate, realTask.dueDate);
    const priorityChanged = (optimisticTask.priority || 10) !== (realTask.priority || 10);
    
    if (dueDateChanged || priorityChanged) {
      // Properties changed significantly, remove and re-insert
      newTasks.splice(index, 1);
      const insertIndex = this.findInsertionIndex(realTask);
      const adjustedIndex = insertIndex > index ? insertIndex - 1 : insertIndex;
      newTasks.splice(adjustedIndex, 0, realTask);
    } else {
      // Properties are similar, just replace in place
      newTasks[index] = realTask;
    }
    
    return new TaskManager(newTasks);
  }

  // Helper to compare dates for significant changes
  private compareDates(date1: Date | string | undefined, date2: Date | string | undefined): boolean {
    if (!date1 && !date2) return false;
    if (!date1 || !date2) return true;
    
    const date1Obj = date1 instanceof Date ? date1 : new Date(date1);
    const date2Obj = date2 instanceof Date ? date2 : new Date(date2);
    
    // Consider dates different if they differ by more than a minute
    return Math.abs(date1Obj.getTime() - date2Obj.getTime()) > 60000;
  }

  // Replace all tasks (for full refresh)
  replaceTasks(newTasks: VTODO[]): TaskManager {
    return new TaskManager(newTasks);
  }

  // Get task counts for different filters
  getTaskCounts(): Record<TaskFilter, number> {
    return {
      all: this.getFilteredTasks("all").length,
      today: this.getFilteredTasks("today").length,
      scheduled: this.getFilteredTasks("scheduled").length,
      completed: this.getFilteredTasks("completed").length,
    };
  }
} 