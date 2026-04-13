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
  static async create(userId) {
    const newId = uuidv7();
    const sqlQuery = `
      INSERT INTO public.groups (group_id, user_id)
      VALUES ($1, $2)
      RETURNING *
    `;
    const result = await query(sqlQuery, [newId, userId]);
    return result.rows[0];
  }
}

export default Group
