"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, ChevronUp, Plus, Save, X } from "lucide-react";
import { VTODO } from "@/lib/vtodo";

interface TaskFormProps {
  mode: 'create' | 'edit';
  task?: VTODO;
  onSubmit: (taskData: TaskFormData) => Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

export interface TaskFormData {
  summary: string;
  description?: string;
  dueDate?: Date;
  priority: 'none' | 'low' | 'medium' | 'high';
  recurrence: 'never' | 'daily' | 'weekly' | 'monthly' | 'yearly';
}

// Constants
const PRIORITY_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
] as const;

const REPEAT_OPTIONS = [
  { value: 'never', label: 'Never' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
] as const;

// Utility functions
const extractRecurrenceFromTask = (task?: VTODO): 'never' | 'daily' | 'weekly' | 'monthly' | 'yearly' => {
  if (!task?.recurrence) return 'never';
  if (task.recurrence.includes('DAILY')) return 'daily';
  if (task.recurrence.includes('WEEKLY')) return 'weekly';
  if (task.recurrence.includes('MONTHLY')) return 'monthly';
  if (task.recurrence.includes('YEARLY')) return 'yearly';
  return 'never';
};

const extractPriorityFromTask = (task?: VTODO): 'none' | 'low' | 'medium' | 'high' => {
  if (!task?.priority) return 'none';
  if (task.priority === 1) return 'high';
  if (task.priority === 5) return 'medium';
  if (task.priority === 9) return 'low';
  return 'none';
};

const extractDateFromTask = (task?: VTODO): string => {
  if (!task?.dueDate) return "";
  return new Date(task.dueDate).toISOString().split('T')[0];
};

const extractTimeFromTask = (task?: VTODO): string => {
  if (!task?.dueDate) return "";
  return new Date(task.dueDate).toTimeString().slice(0, 5);
};

export default function TaskForm({ 
  mode, 
  task, 
  onSubmit, 
  onCancel, 
  isSubmitting = false 
}: TaskFormProps) {
  // State initialization
  const [taskTitle, setTaskTitle] = useState(task?.summary || "");
  const [taskNotes, setTaskNotes] = useState(task?.description || "");
  const [taskEndDate, setTaskEndDate] = useState(extractDateFromTask(task));
  const [taskEndTime, setTaskEndTime] = useState(extractTimeFromTask(task));
  const [taskRepeat, setTaskRepeat] = useState(extractRecurrenceFromTask(task));
  const [taskPriority, setTaskPriority] = useState(extractPriorityFromTask(task));
  const [showAdvancedForm, setShowAdvancedForm] = useState(mode === 'edit');

  // Reusable field renderers
  const renderTextField = (
    id: string,
    label: string,
    value: string,
    onChange: (value: string) => void,
    type: 'text' | 'date' | 'time' = 'text',
    placeholder?: string
  ) => (
    <div>
      <Label htmlFor={id} className="text-sm text-gray-600">{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1"
        disabled={isSubmitting}
      />
    </div>
  );

  const renderSelectField = <T extends string>(
    id: string,
    label: string,
    value: T,
    onChange: (value: T) => void,
    options: readonly { value: T; label: string }[]
  ) => (
    <div>
      <Label htmlFor={id} className="text-sm text-gray-600">{label}</Label>
      <Select value={value} onValueChange={onChange} disabled={isSubmitting}>
        <SelectTrigger className="mt-1 w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map(option => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  const renderAdvancedFields = () => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="notes" className="text-sm text-gray-600">Notes</Label>
        <Textarea
          id="notes"
          placeholder="Add notes..."
          value={taskNotes}
          onChange={(e) => setTaskNotes(e.target.value)}
          className="mt-1 min-h-[80px] resize-none"
          disabled={isSubmitting}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {renderTextField("endDate", "Due Date", taskEndDate, setTaskEndDate, "date")}
        {renderTextField("endTime", "Due Time", taskEndTime, setTaskEndTime, "time")}
        {renderSelectField("repeat", "Repeat", taskRepeat, setTaskRepeat, REPEAT_OPTIONS)}
        {renderSelectField("priority", "Priority", taskPriority, setTaskPriority, PRIORITY_OPTIONS)}
      </div>
    </div>
  );

  const resetForm = () => {
    setTaskTitle("");
    setTaskNotes("");
    setTaskEndDate("");
    setTaskEndTime("");
    setTaskRepeat("never");
    setTaskPriority("none");
    setShowAdvancedForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!taskTitle.trim()) return;

    // Close advanced fields immediately when submitting
    setShowAdvancedForm(false);

    // Combine date and time for due date
    let dueDate: Date | undefined;
    if (taskEndDate) {
      dueDate = new Date(taskEndDate);
      if (taskEndTime) {
        const [hours, minutes] = taskEndTime.split(':');
        dueDate.setHours(parseInt(hours), parseInt(minutes));
      }
    }

    const formData: TaskFormData = {
      summary: taskTitle.trim(),
      description: taskNotes.trim() || undefined,
      dueDate,
      priority: taskPriority,
      recurrence: taskRepeat,
    };

    await onSubmit(formData);

    // Reset form only in create mode
    if (mode === 'create') {
      resetForm();
    }
  };

  const isFormValid = taskTitle.trim().length > 0;

  // Edit mode rendering
  if (mode === 'edit') {
    return (
      <div className="space-y-4">
        <Input
          value={taskTitle}
          onChange={(e) => setTaskTitle(e.target.value)}
          className="text-lg font-medium"
          placeholder="Task title..."
          disabled={isSubmitting}
        />

        {renderAdvancedFields()}

        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onCancel} disabled={isSubmitting}>
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={isSubmitting || !isFormValid}>
            <Save className="h-4 w-4 mr-1" />
            Save
          </Button>
        </div>
      </div>
    );
  }

  // Create mode rendering
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            placeholder="Add a new task..."
            value={taskTitle}
            onChange={(e) => setTaskTitle(e.target.value)}
            className="border-0 shadow-none text-lg placeholder:text-gray-400 focus-visible:ring-0"
            disabled={isSubmitting}
          />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setShowAdvancedForm(!showAdvancedForm)}
          className="shrink-0"
          disabled={isSubmitting}
        >
          {showAdvancedForm ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
        <Button type="submit" size="icon" className="shrink-0" disabled={isSubmitting || !isFormValid}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {showAdvancedForm && (
        <div className="pt-2 border-t">
          {renderAdvancedFields()}
        </div>
      )}
    </form>
  );
} 