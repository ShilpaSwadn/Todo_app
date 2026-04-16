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
    const { name, description, members = [] } = data;
    const newId = uuidv7();
    const sqlQuery = `
      INSERT INTO public.groups (group_id, user_id, group_name, group_description, group_members)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const result = await query(sqlQuery, [newId, userId, name, description, members]);
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
}

export default Group
