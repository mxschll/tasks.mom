'use client'

import { VTODO } from "@/lib/vtodo";
import TaskItem from "./task-item";
import TaskTabs from "./task-tabs";
import { useState, useMemo } from "react";
import { FilterType } from "@/types/task";

interface TaskListProps {
  tasks: VTODO[];
  onTaskUpdated?: (updatedTask: VTODO) => void;
  onTaskUpdateFailed?: (originalTask: VTODO) => void;
  onTaskDeleted?: (taskUid: string) => void;
  onTaskDeleteFailed?: (task: VTODO) => void;
  calendarUrl?: string;
}

export default function TaskList({ 
  tasks, 
  onTaskUpdated, 
  onTaskUpdateFailed, 
  onTaskDeleted,
  onTaskDeleteFailed,
  calendarUrl 
}: TaskListProps) {
    const [filter, setFilter] = useState<FilterType>("all");

    // Pre-compute all filtered task lists once
    const filteredTasksMap = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const isToday = (date: Date | undefined): boolean => {
            if (!date) return false;
            const dateOnly = new Date(date);
            dateOnly.setHours(0, 0, 0, 0);
            return dateOnly.getTime() === today.getTime();
        };

        const activeTasks = tasks.filter(
            (task) => task.status !== "COMPLETED" && task.status !== "CANCELLED"
        );

        const completedTasks = tasks
            .filter((task) => task.status === "COMPLETED")
            .sort((a, b) => {
                if (!a.completedDate && !b.completedDate) return 0;
                if (!a.completedDate) return 1;
                if (!b.completedDate) return -1;
                
                // Ensure dates are Date objects before calling getTime()
                const aDateObj = a.completedDate instanceof Date ? a.completedDate : new Date(a.completedDate);
                const bDateObj = b.completedDate instanceof Date ? b.completedDate : new Date(b.completedDate);
                
                return bDateObj.getTime() - aDateObj.getTime();
            });

        const todayTasks = activeTasks.filter(
            (task) => isToday(task.dueDate) || isToday(task.startDate)
        );

        const scheduledTasks = activeTasks
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
                
                // Ensure dates are Date objects before calling getTime()
                const aDateObj = aDate instanceof Date ? aDate : new Date(aDate);
                const bDateObj = bDate instanceof Date ? bDate : new Date(bDate);
                
                return aDateObj.getTime() - bDateObj.getTime();
            });

        return {
            all: activeTasks,
            today: todayTasks,
            scheduled: scheduledTasks,
            completed: completedTasks,
        };
    }, [tasks]);

    const currentTasks = filteredTasksMap[filter];

    return (
        <>
            <TaskTabs
                currentFilter={filter}
                onChange={setFilter}
                taskCounts={filteredTasksMap}
            />

            <ul className="space-y-3">
                {currentTasks.map((task) => (
                    <TaskItem 
                      key={task.uid} 
                      task={task} 
                      onTaskUpdated={onTaskUpdated}
                      onTaskUpdateFailed={onTaskUpdateFailed}
                      onTaskDeleted={onTaskDeleted}
                      onTaskDeleteFailed={onTaskDeleteFailed}
                      calendarUrl={calendarUrl}
                    />
                ))}
            </ul>
        </>
    );
}
