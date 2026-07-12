import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

export function statusColor(status: string): string {
  const map: Record<string, string> = {
    created: 'bg-gray-100 text-gray-700',
    generation_complete: 'bg-blue-100 text-blue-700',
    import_complete: 'bg-yellow-100 text-yellow-700',
    validation_complete: 'bg-indigo-100 text-indigo-700',
    diagram_complete: 'bg-purple-100 text-purple-700',
    sme_review_complete: 'bg-orange-100 text-orange-700',
    export_complete: 'bg-teal-100 text-teal-700',
    synced: 'bg-green-100 text-green-700',
    // question statuses
    staged: 'bg-gray-100 text-gray-600',
    validated: 'bg-blue-100 text-blue-700',
    validation_failed: 'bg-red-100 text-red-700',
    diagram_pending: 'bg-yellow-100 text-yellow-700',
    diagram_done: 'bg-purple-100 text-purple-700',
    under_review: 'bg-orange-100 text-orange-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
  }
  return map[status] ?? 'bg-gray-100 text-gray-600'
}

export function statusLabel(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}
