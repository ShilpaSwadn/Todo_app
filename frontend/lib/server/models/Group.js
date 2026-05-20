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
   * Find all groups a user is a member of (or owns)
   */
  static async findByMemberId(userId) {
    const sqlQuery = 'SELECT * FROM public.groups WHERE user_id = $1 OR $1 = ANY(group_members)';
    const result = await query(sqlQuery, [userId]);
    const groups = result.rows;

    for (const group of groups) {
      const addressesResult = await query(`
        SELECT a.address_id as id, a.address_line1 as "addressLine1", a.address_line2 as "addressLine2",
               a.city, a.state_province as "stateProvince", a.postal_code as "postalCode", a.country
        FROM public.addresses a
        JOIN public.group_addresses ga ON ga.address_id = a.address_id
        WHERE ga.group_id = $1
        ORDER BY a.created_at ASC
      `, [group.group_id]);

      const addresses = addressesResult.rows;
      group.addresses = addresses;
      group.address = addresses[0] || null;
    }

    return groups;
  }

  /**
   * Find a group by group ID
   */
  static async findById(groupId) {
    const groupResult = await query('SELECT * FROM public.groups WHERE group_id = $1', [groupId]);
    const group = groupResult.rows[0];
    if (!group) return null;

    // Fetch all addresses for this group
    const addressesResult = await query(`
      SELECT a.address_id as id, a.address_line1 as "addressLine1", a.address_line2 as "addressLine2",
             a.city, a.state_province as "stateProvince", a.postal_code as "postalCode", a.country
      FROM public.addresses a
      JOIN public.group_addresses ga ON ga.address_id = a.address_id
      WHERE ga.group_id = $1
      ORDER BY a.created_at ASC
    `, [groupId]);

    const addresses = addressesResult.rows;
    group.addresses = addresses;
    group.address = addresses[0] || null;
    return group;
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

    const group = result.rows[0] || null;
    if (group) {
      group.addresses = [];
      group.address = null;
    }
    return group;
  }

  static async update(groupId, data) {
    const { name, description, defaultAddressId } = data;
    const sqlQuery = `
      UPDATE public.groups 
      SET group_name = $1, group_description = $2, created_at = created_at
      WHERE group_id = $3
      RETURNING *
    `;
    const result = await query(sqlQuery, [name, description, groupId]);

    return this.findById(groupId);
  }

  static async addAddress(groupIdOrIds, address) {
    const addressId = uuidv7();

    // Insert into addresses
    await query(`
      INSERT INTO public.addresses (address_id, address_line1, address_line2, city, state_province, postal_code, country)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      addressId,
      address.addressLine1,
      address.addressLine2 || '',
      address.city,
      address.stateProvince || null,
      address.postalCode || null,
      address.country
    ]);

    const groupIds = Array.isArray(groupIdOrIds) ? groupIdOrIds : [groupIdOrIds];

    for (const gid of groupIds) {
      await query(`
        INSERT INTO public.group_addresses (group_id, address_id)
        VALUES ($1, $2)
      `, [gid, addressId]);
    }

    return this.findById(groupIds[0]);
  }

  static async editAddress(groupIdOrIds, addressId, updatedAddress) {
    // Update the address in public.addresses
    await query(`
      UPDATE public.addresses
      SET address_line1 = $1, address_line2 = $2, city = $3, state_province = $4, postal_code = $5, country = $6
      WHERE address_id = $7
    `, [
      updatedAddress.addressLine1,
      updatedAddress.addressLine2 || '',
      updatedAddress.city,
      updatedAddress.stateProvince || null,
      updatedAddress.postalCode || null,
      updatedAddress.country,
      addressId
    ]);

    const groupIds = Array.isArray(groupIdOrIds) ? groupIdOrIds : [groupIdOrIds];

    // Delete any previous group links for this address that are NOT in the new list
    if (groupIds.length > 0) {
      await query(`
        DELETE FROM public.group_addresses
        WHERE address_id = $1 AND NOT (group_id = ANY($2::uuid[]))
      `, [addressId, groupIds]);
    } else {
      await query(`
        DELETE FROM public.group_addresses
        WHERE address_id = $1
      `, [addressId]);
    }

    // Upsert the links for the selected groups
    for (const gid of groupIds) {
      // Check if link exists
      const linkCheck = await query(`
        SELECT 1 FROM public.group_addresses WHERE group_id = $1 AND address_id = $2
      `, [gid, addressId]);

      if (linkCheck.rows.length === 0) {
        // Insert new link
        await query(`
          INSERT INTO public.group_addresses (group_id, address_id)
          VALUES ($1, $2)
        `, [gid, addressId]);
      }
    }

    return this.findById(groupIds[0]);
  }

  static async removeAddress(groupId, addressId) {
    // Delete from group_addresses junction table first
    await query(`
      DELETE FROM public.group_addresses
      WHERE group_id = $1 AND address_id = $2
    `, [groupId, addressId]);

    // Delete from addresses table if it is no longer referenced by any other group
    const referencedResult = await query(`
      SELECT 1 FROM public.group_addresses WHERE address_id = $1
    `, [addressId]);

    if (referencedResult.rows.length === 0) {
      await query(`
        DELETE FROM public.addresses WHERE address_id = $1
      `, [addressId]);
    }

    return this.findById(groupId);
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
