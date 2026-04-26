import { query } from '../config/database.js'
import { v7 as uuidv7 } from 'uuid'

class Group {
  /**
   * Find a group by user ID
   */
  static async findByUserId(userId) {
    const sqlQuery = 'SELECT * FROM public.groups WHERE user_id = $1';
    const result = await query(sqlQuery, [userId]);
    return result.rows[0] || null;
  }

  /**
   * Find a group by group ID
   */
  static async findById(groupId) {
    const sqlQuery = 'SELECT * FROM public.groups WHERE group_id = $1';
    const result = await query(sqlQuery, [groupId]);
    return result.rows[0] || null;
  }

  /**
   * Manual creation (fallback or direct use)
   */
  static async create(userId, data = {}) {
    const { name, description, members = [], isDefault = false } = data;
    const newId = uuidv7();
    const sqlQuery = `
      INSERT INTO public.groups (group_id, user_id, group_name, group_description, group_members, is_default)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const result = await query(sqlQuery, [newId, userId, name, description, members, isDefault]);
    
    // Automatically assign GROUP_ADMIN and GROUP_MEMBER roles to the creator
    if (result.rows[0]) {
      await query(`
        INSERT INTO public.user_roles (user_id, group_id, user_roles)
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id, group_id) DO UPDATE SET user_roles = EXCLUDED.user_roles
      `, [userId, newId, ['GROUP_ADMIN', 'GROUP_MEMBER']]);
    }

    return result.rows[0] || null;
  }
  static async update(groupId, userId, data) {
    const { name, description } = data;
    const sqlQuery = `
      UPDATE public.groups 
      SET group_name = $1, group_description = $2, created_at = created_at
      WHERE group_id = $3 AND user_id = $4
      RETURNING *
    `;
    const result = await query(sqlQuery, [name, description, groupId, userId]);
    return result.rows[0] || null;
  }
  static async delete(groupId, userId) {
    const sqlQuery = `
      DELETE FROM public.groups 
      WHERE group_id = $1 AND user_id = $2
      RETURNING *
    `;
    const result = await query(sqlQuery, [groupId, userId]);
    return result.rows[0] || null;
  }
  static async enable(groupId, userId) {
    const sqlQuery = `
      UPDATE public.groups 
      SET is_active = true
      WHERE group_id = $1 AND user_id = $2
      RETURNING *
    `;
    const result = await query(sqlQuery, [groupId, userId]);
    return result.rows[0] || null;
  }
}

export default Group
