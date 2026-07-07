export function hasPermission(user, permission) {
  const permissions = Array.isArray(user?.permissions) ? user.permissions : []

  return permissions.includes(permission)
}

export function canAccessScanner(user) {
  if (!user) {
    return false
  }

  return (
    user.role === 'scanner' ||
    user.role === 'admin' ||
    hasPermission(user, 'scan') ||
    hasPermission(user, 'scan_tickets')
  )
}

export function canAccessDashboard(user) {
  if (!user) {
    return false
  }

  return user.role !== 'scanner'
}

export function getDefaultRoute(user) {
  if (canAccessScanner(user) && user?.role === 'scanner') {
    return '/scanner'
  }

  return '/dashboard'
}
