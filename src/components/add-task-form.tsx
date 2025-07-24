"use client";

import { Card, CardContent } from "@/components/ui/card";
import TaskForm, { TaskFormData } from "./task-form";
import { VTODO } from "@/lib/vtodo";

interface AddTaskFormProps {
  selectedCalendarUrl?: string;
  onTaskAdded: () => void;
  onTaskAddedOptimistically: (task: VTODO) => void;
  onTaskAddFailed: (taskUid: string) => void;
  onTaskReplaceOptimistic: (tempUid: string, realTask: VTODO) => void;
}

export default function AddTaskForm({
  selectedCalendarUrl,
  onTaskAdded,
  onTaskAddedOptimistically,
  onTaskAddFailed,
  onTaskReplaceOptimistic
}: AddTaskFormProps) {

  const showAlert = (message: string) => {
    alert(message);
  };

  const createOptimisticTask = (
    title: string,
    description?: string,
    dueDate?: Date,
    priority?: string
  ): VTODO => {
    const uid = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    return {
      uid,
      summary: title,
      description,
      dueDate,
      status: "NEEDS-ACTION",
      priority: priority === 'high' ? 1 : priority === 'medium' ? 5 : priority === 'low' ? 9 : undefined,
      created: new Date(),
      lastModified: new Date(),
    };
  };

  const handleSubmit = async (formData: TaskFormData) => {
    if (!selectedCalendarUrl) {
      showAlert("No calendar selected");
      return;
    }

    // Create optimistic task and add it immediately to UI
    const optimisticTask = createOptimisticTask(
      formData.summary,
      formData.description,
      formData.dueDate,
      formData.priority
    );

    onTaskAddedOptimistically(optimisticTask);

    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summary: formData.summary,
          description: formData.description,
          dueDate: formData.dueDate?.toISOString(),
          priority: formData.priority,
          recurrence: formData.recurrence,
          calendarUrl: selectedCalendarUrl,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create task');
      }

      const result = await response.json();

      if (result.success && result.task) {
        onTaskReplaceOptimistic(optimisticTask.uid, result.task);
      } else {
        throw new Error('Invalid server response');
      }
    } catch (error) {
      console.error("Failed to create task:", error);

      // Remove the optimistic task since it failed
      onTaskAddFailed(optimisticTask.uid);

      // Show error alert
      showAlert("Failed to create task. Please try again.");
    }
  };

  return (
    <Card className="mb-6">
      <CardContent>
        <TaskForm mode="create" selectedCalendarUrl={selectedCalendarUrl} onSubmit={handleSubmit} />
      </CardContent>
    </Card>
  );
}
