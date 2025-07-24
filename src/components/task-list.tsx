'use client'

import { VTODO } from "@/lib/vtodo";
import { TaskManager, TaskFilter } from "@/lib/task-manager";
import TaskItem from "./task-item";
import TaskTabs from "./task-tabs";
import { useState, useMemo } from "react";

interface TaskListProps {
  taskManager: TaskManager;
  onTaskUpdated?: (updatedTask: VTODO) => void;
  onTaskUpdateFailed?: (originalTask: VTODO) => void;
  onTaskDeleted?: (taskUid: string) => void;
  onTaskDeleteFailed?: (task: VTODO) => void;
  calendarUrl?: string;
}

export default function TaskList({ 
  taskManager, 
  onTaskUpdated, 
  onTaskUpdateFailed, 
  onTaskDeleted,
  onTaskDeleteFailed,
  calendarUrl 
}: TaskListProps) {
    const [filter, setFilter] = useState<TaskFilter>("all");

    // Pre-compute all filtered task lists once
    const filteredTasksMap = useMemo(() => {
        return {
            all: taskManager.getFilteredTasks("all"),
            today: taskManager.getFilteredTasks("today"),
            scheduled: taskManager.getFilteredTasks("scheduled"),
            completed: taskManager.getFilteredTasks("completed"),
        };
    }, [taskManager]);

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
