export function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'high': return 'text-red-500';
    case 'medium': return 'text-orange-500';
    case 'low': return 'text-blue-500';
    default: return '';
  }
}

export function getPriorityIcon(priority: string): string {
  switch (priority) {
    case 'high': return '!!!';
    case 'medium': return '!!';
    case 'low': return '!';
    default: return '';
  }
}

export function formatDate(date: Date | string): string {
  // Convert string to Date object if needed
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const isToday = dateObj.toDateString() === today.toDateString();
  const isTomorrow = dateObj.toDateString() === tomorrow.toDateString();
  
  if (isToday) return 'Today';
  if (isTomorrow) return 'Tomorrow';
  
  return dateObj.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: dateObj.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
  });
}

export function convertPriorityFromVTODO(priority?: number): 'none' | 'low' | 'medium' | 'high' {
  if (!priority) return 'none';
  if (priority === 1) return 'high';
  if (priority === 5) return 'medium';
  if (priority === 9) return 'low';
  return 'none';
}

export function convertPriorityToVTODO(priority: 'none' | 'low' | 'medium' | 'high'): number | undefined {
  switch (priority) {
    case 'high': return 1;
    case 'medium': return 5;
    case 'low': return 9;
    default: return undefined;
  }
} 