'use client'

import { Card, CardContent } from "./ui/card"
import { Checkbox } from "./ui/checkbox"
import { Button } from "./ui/button"
import { VTODO } from "@/lib/vtodo"
import { useState } from "react"
import { Calendar, Repeat, Edit3, Trash2, Clock } from "lucide-react"
import { getPriorityColor, getPriorityIcon, formatDate, convertPriorityFromVTODO } from "@/lib/task-utils"
import TaskForm, { TaskFormData } from "./task-form"

interface TaskItemProps {
  task: VTODO;
  onTaskUpdated?: (updatedTask: VTODO) => void;
  onTaskUpdateFailed?: (originalTask: VTODO) => void;
  onTaskDeleted?: (taskUid: string) => void;
  onTaskDeleteFailed?: (task: VTODO) => void;
  calendarUrl?: string;
}

export default function TaskItem({ 
  task, 
  onTaskUpdated, 
  onTaskUpdateFailed, 
  onTaskDeleted,
  onTaskDeleteFailed,
  calendarUrl 
}: TaskItemProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const isCompleted = task.status === "COMPLETED";
  const priority = convertPriorityFromVTODO(task.priority);
  
  // Check if task is still being created (has temporary UID)
  const isBeingCreated = task.uid.startsWith('temp-');
  const canEdit = !isBeingCreated && !isUpdating && !isDeleting;

  const handleCheckboxChange = async (checked: boolean) => {
    if (isUpdating || !calendarUrl || isBeingCreated) return;

    setIsUpdating(true);
    
    // Create optimistic update
    const updatedTask: VTODO = {
      ...task,
      status: checked ? "COMPLETED" : "NEEDS-ACTION",
      completedDate: checked ? new Date() : undefined,
      lastModified: new Date(),
    };

    // Apply optimistic update immediately
    onTaskUpdated?.(updatedTask);

    try {
      const response = await fetch('/api/tasks/update', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskUid: task.uid,
          status: checked ? 'COMPLETED' : 'NEEDS-ACTION',
          calendarUrl: calendarUrl,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Update failed:', errorData);
        throw new Error(`Failed to update task: ${errorData.error}`);
      }

    } catch (error) {
      console.error("Failed to update task:", error);
      
      // Revert optimistic update on failure
      onTaskUpdateFailed?.(task);
      
      alert("Failed to update task. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleEdit = async (formData: TaskFormData) => {
    if (!calendarUrl || isBeingCreated) return;

    setIsUpdating(true);

    // Create optimistic update
    const updatedTask: VTODO = {
      ...task,
      summary: formData.summary,
      description: formData.description,
      dueDate: formData.dueDate,
      priority: formData.priority === 'high' ? 1 : formData.priority === 'medium' ? 5 : formData.priority === 'low' ? 9 : undefined,
      lastModified: new Date(),
    };

    // Apply optimistic update immediately
    onTaskUpdated?.(updatedTask);
    setIsEditing(false);

    try {
      const updatePayload = {
        taskUid: task.uid,
        summary: formData.summary,
        description: formData.description,
        dueDate: formData.dueDate?.toISOString(),
        priority: formData.priority,
        recurrence: formData.recurrence,
        calendarUrl: calendarUrl,
      };

      const response = await fetch('/api/tasks/update-full', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatePayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Update failed:', errorData);
        throw new Error(`Failed to update task: ${errorData.error}`);
      }

    } catch (error) {
      console.error("Failed to update task:", error);
      
      // Revert optimistic update on failure
      onTaskUpdateFailed?.(task);
      setIsEditing(true);
      
      alert("Failed to update task. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!calendarUrl || isBeingCreated || !confirm('Are you sure you want to delete this task?')) return;

    setIsDeleting(true);

    // Apply optimistic delete immediately
    onTaskDeleted?.(task.uid);

    try {
      const response = await fetch('/api/tasks/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskUid: task.uid,
          calendarUrl: calendarUrl,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Delete failed:', errorData);
        throw new Error(`Failed to delete task: ${errorData.error}`);
      }

      console.log('Task deleted successfully');
    } catch (error) {
      console.error("Failed to delete task:", error);
      
      // Revert optimistic delete on failure
      onTaskDeleteFailed?.(task);
      
      alert("Failed to delete task. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const getRecurrenceText = () => {
    if (!task.recurrence) return null;
    if (task.recurrence.includes('DAILY')) return 'daily';
    if (task.recurrence.includes('WEEKLY')) return 'weekly';
    if (task.recurrence.includes('MONTHLY')) return 'monthly';
    if (task.recurrence.includes('YEARLY')) return 'yearly';
    return null;
  };

  if (isEditing && canEdit) {
    return (
      <Card className="group hover:shadow-md transition-shadow">
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <Checkbox 
              checked={isCompleted} 
              onCheckedChange={handleCheckboxChange}
              className="h-5 w-5"
              disabled={isUpdating || isBeingCreated}
            />
            <span className="text-sm text-gray-500">Editing task</span>
          </div>
          <TaskForm
            mode="edit"
            task={task}
            onSubmit={handleEdit}
            onCancel={() => setIsEditing(false)}
            isSubmitting={isUpdating}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`group transition-all duration-200 ${
      isBeingCreated 
        ? "opacity-60 animate-pulse bg-gray-50 border-gray-200" 
        : isCompleted 
          ? "opacity-60 hover:shadow-md" 
          : "hover:shadow-md"
    }`}>
      <CardContent>
        <div className="flex items-start gap-3">
          <Checkbox 
            checked={isCompleted} 
            onCheckedChange={handleCheckboxChange}
            className="h-5 w-5 mt-0.5"
            disabled={isUpdating || isBeingCreated}
          />
          <div 
            className={`flex-1 min-w-0 ${canEdit ? 'cursor-pointer' : 'cursor-default'}`} 
            onClick={() => canEdit && setIsEditing(true)}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-lg ${isCompleted ? 'text-gray-600 line-through' : 'text-gray-900'}`}>
                {task.summary}
              </span>
              {priority !== "none" && (
                <span className={`text-xs font-bold ${getPriorityColor(priority)}`}>
                  {getPriorityIcon(priority)}
                </span>
              )}
              {isBeingCreated && (
                <div className="flex items-center gap-1 text-xs text-gray-500" title="Creating task...">
                  <Clock className="h-3 w-3" />
                  <span>Creating...</span>
                </div>
              )}
            </div>

            {task.description && (
              <p className={`text-sm mb-2 ${isCompleted ? 'text-gray-500 line-through' : 'text-gray-600'}`}>
                {task.description}
              </p>
            )}

            <div className="flex items-center gap-4 text-xs text-gray-500">
              {task.dueDate && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span className={task.dueDate < new Date() && !isCompleted ? "text-red-500 font-medium" : ""}>
                    {formatDate(task.dueDate)}
                  </span>
                </div>
              )}

              {getRecurrenceText() && (
                <div className="flex items-center gap-1">
                  <Repeat className="h-3 w-3" />
                  <span className="capitalize">{getRecurrenceText()}</span>
                </div>
              )}
            </div>
          </div>

          <div className={`flex gap-1 transition-opacity ${
            canEdit ? 'opacity-0 group-hover:opacity-100' : 'opacity-0'
          }`}>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation()
                canEdit && setIsEditing(true)
              }}
              className="text-gray-400 hover:text-blue-500 shrink-0"
              disabled={!canEdit}
              title={isBeingCreated ? "Task is being created..." : "Edit task"}
            >
              <Edit3 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation()
                canEdit && handleDelete()
              }}
              className="text-gray-400 hover:text-red-500 shrink-0"
              disabled={!canEdit}
              title={isBeingCreated ? "Task is being created..." : "Delete task"}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
