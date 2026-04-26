import { query } from '../config/database.js'

class UserRole {
  /**
   * Get roles for a specific group
   */
  static async getRolesByGroup(groupId) {
    const sqlQuery = `
      SELECT ur.user_id, ur.user_roles, u.first_name, u.last_name, u.email
      FROM public.user_roles ur
      JOIN public.users u ON ur.user_id = u.id
      WHERE ur.group_id = $1
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
    return result.rows[0];
  }

  /**
   * Set roles for multiple users at once
   */
  static async setBulkRoles(userIds, groupId, roles) {
    const results = [];
    for (const userId of userIds) {
      const res = await this.setRoles(userId, groupId, roles);
      results.push(res);
    }
    return results;
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
