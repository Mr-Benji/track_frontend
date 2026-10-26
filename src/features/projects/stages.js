// Every project has To Do / In Progress / Done; the backend slots any custom
// stages between In Progress and Done and orders them by displayOrder.
export const DEFAULT_STATUSES = ['To Do', 'In Progress', 'Done']

export function projectStatuses(project) {
  const stages = project?.workflowStages
  if (!stages?.length) return DEFAULT_STATUSES
  return [...stages].sort((a, b) => a.displayOrder - b.displayOrder).map((s) => s.name)
}

// Statuses across several projects (board columns, status filter): the
// defaults keep their place and every project's custom stages go in between,
// in first-seen order.
export function combinedStatuses(projects) {
  const custom = []
  for (const project of projects) {
    for (const name of projectStatuses(project)) {
      if (!DEFAULT_STATUSES.includes(name) && !custom.includes(name)) custom.push(name)
    }
  }
  return [DEFAULT_STATUSES[0], DEFAULT_STATUSES[1], ...custom, DEFAULT_STATUSES[2]]
}
