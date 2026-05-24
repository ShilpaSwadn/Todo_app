import { query } from '../config/database.js'

class UserRole {
  /**
   * Get roles for a specific group
   */
  static async getRolesByGroup(groupId) {
    const sqlQuery = `
      SELECT 
        u.id as user_id, 
        u.first_name, 
        u.last_name, 
        u.email,
        CASE 
          WHEN u.id = g.user_id THEN COALESCE(ur.user_roles, ARRAY['GROUP_ADMIN', 'GROUP_MEMBER'])
          ELSE COALESCE(ur.user_roles, ARRAY['GROUP_MEMBER'])
        END as user_roles
      FROM public.groups g
      JOIN public.users u ON u.id = ANY(array_append(g.group_members, g.user_id))
      LEFT JOIN public.user_roles ur ON ur.user_id = u.id AND ur.group_id = g.group_id
      WHERE g.group_id = $1
      ORDER BY (u.id = g.user_id) DESC, u.first_name ASC
    `;
    const result = await query(sqlQuery, [groupId]);
    return result.rows;
  }

  /**
   * Get roles for a specific user in a specific group
   */
  static async getUserRoles(userId, groupId) {
    const sqlQuery = 'SELECT user_roles FROM public.user_roles WHERE user_id = $1 AND group_id = $2';
    const result = await query(sqlQuery, [userId, groupId]);
    return result.rows[0]?.user_roles || ['GROUP_MEMBER'];
  }

  /**
   * Update or set a user's roles in a group
   */
  static async setRoles(userId, groupId, roles) {
    // Ensure 'GROUP_MEMBER' is always included by default as per request
    const rolesToSet = Array.isArray(roles) ? roles : [roles];
    if (!rolesToSet.includes('GROUP_MEMBER')) {
      rolesToSet.push('GROUP_MEMBER');
    }

    const sqlQuery = `
      INSERT INTO public.user_roles (user_id, group_id, user_roles)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, group_id) 
      DO UPDATE SET user_roles = EXCLUDED.user_roles
      RETURNING *
    `;
    const result = await query(sqlQuery, [userId, groupId, rolesToSet]);
    return result.rows[0]?.user_roles;
  }

  /**
   * Set roles for multiple users at once
   */
  static async setBulkRoles(userIds, groupId, roles) {
    let lastRoles = roles;
    for (const userId of userIds) {
      lastRoles = await this.setRoles(userId, groupId, roles);
    }
    return lastRoles;
  }

  /**
   * Check if a user has a specific role in a group
   */
  static async hasRole(userId, groupId, role) {
    const roles = await this.getUserRoles(userId, groupId);
    return roles.includes(role);
  }

  /**
   * Check if a user is an admin or owner of a group
   */
  static async isAuthorized(userId, groupId) {
    const [roles, group] = await Promise.all([
      this.getUserRoles(userId, groupId),
      query('SELECT user_id FROM public.groups WHERE group_id = $1', [groupId])
    ]);
    const isOwner = group.rows[0]?.user_id === userId;
    const isAdmin = roles.includes('GROUP_ADMIN');
    return isOwner || isAdmin;
  }

  /**
   * Check if a user can manage payments in a group
   * Personal hub (self) owner always has permission
   */
  static async canManagePayments(userId, groupId) {
    const [roles, group] = await Promise.all([
      this.getUserRoles(userId, groupId),
      query('SELECT user_id, is_default FROM public.groups WHERE group_id = $1', [groupId])
    ]);
    if (group.rows[0]?.user_id === userId && group.rows[0]?.is_default) return true;
    return roles.includes('PAYMENT_ADMIN');
  }

  /**
   * Check if a user can view payments in a group
   * Personal hub (self) owner always has permission
   */
  static async canViewPayments(userId, groupId) {
    const [roles, group] = await Promise.all([
      this.getUserRoles(userId, groupId),
      query('SELECT user_id, is_default FROM public.groups WHERE group_id = $1', [groupId])
    ]);
    if (group.rows[0]?.user_id === userId && group.rows[0]?.is_default) return true;
    return roles.some(r => ['PAYMENT_ADMIN', 'PAYMENT_USER'].includes(r));
  }

  /**
   * Check if a user can manage group addresses (add/edit/delete)
   * Personal hub (self) owner always has permission
   */
  static async canManageAddress(userId, groupId) {
    const [roles, group] = await Promise.all([
      this.getUserRoles(userId, groupId),
      query('SELECT user_id, is_default FROM public.groups WHERE group_id = $1', [groupId])
    ]);
    if (group.rows[0]?.user_id === userId && group.rows[0]?.is_default) return true;
    return roles.includes('GROUP_ADDRESS_ADMIN');
  }

  /**
   * Check if a user can view group addresses (GROUP_ADDRESS_USER or higher)
   * Personal hub (self) owner always has permission
   */
  static async canViewAddress(userId, groupId) {
    const [roles, group] = await Promise.all([
      this.getUserRoles(userId, groupId),
      query('SELECT user_id, is_default FROM public.groups WHERE group_id = $1', [groupId])
    ]);
    if (group.rows[0]?.user_id === userId && group.rows[0]?.is_default) return true;
    return roles.some(r => ['GROUP_ADDRESS_ADMIN', 'GROUP_ADDRESS_USER'].includes(r));
  }

  /**
   * Remove a user's role (effectively removing them from the group's role management)
   */
  static async removeRole(userId, groupId) {
    const sqlQuery = 'DELETE FROM public.user_roles WHERE user_id = $1 AND group_id = $2';
    await query(sqlQuery, [userId, groupId]);
  }
}

export default UserRole
