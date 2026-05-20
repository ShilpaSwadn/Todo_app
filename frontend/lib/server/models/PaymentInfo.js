import { query } from '../config/database.js'
import { v7 as uuidv7 } from 'uuid'

class PaymentInfo {
  /**
   * Find payment info by user ID
   */
  static async findByUserId(userId) {
    const sqlQuery = 'SELECT * FROM public.payment_info WHERE user_id = $1';
    const result = await query(sqlQuery, [userId]);
    return result.rows || [];
  }

  /**
   * Find payment info by group ID
   */
  static async findByGroupId(groupId) {
    const sqlQuery = `
      SELECT p.*, gp.group_id
      FROM public.payment_info p
      JOIN public.group_payments gp ON gp.payment_details_id = p.payment_details_id
      WHERE gp.group_id = $1 AND p.is_active = true
    `;
    const result = await query(sqlQuery, [groupId]);
    return result.rows || [];
  }

  /**
   * Create a new payment info record
   */
  static async create(paymentData) {
    const { 
      groupIds,
      groupId, 
      userId, 
      cardholderName, 
      cardNumber, // Previously lastFour
      expiryDate, 
      provider,
      cardBrand,
      fundingType,
      isVerified
    } = paymentData;

    const targetGroupIds = groupIds && Array.isArray(groupIds) ? groupIds : (groupId ? [groupId] : []);
    const primaryGroupId = targetGroupIds[0] || null;

    const sqlQuery = `
      INSERT INTO public.payment_info (
        group_id, 
        user_id, 
        cardholder_name, 
        card_number, 
        expiry_date, 
        provider,
        card_brand,
        funding_type,
        is_verified
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    const result = await query(sqlQuery, [
      primaryGroupId, 
      userId, 
      cardholderName, 
      cardNumber, 
      expiryDate, 
      provider,
      cardBrand,
      fundingType,
      isVerified
    ]);
    
    const createdPayment = result.rows[0];

    // Insert links into group_payments
    if (createdPayment && targetGroupIds.length > 0) {
      for (const gid of targetGroupIds) {
        await query(`
          INSERT INTO public.group_payments (group_id, payment_details_id)
          VALUES ($1, $2)
          ON CONFLICT DO NOTHING
        `, [gid, createdPayment.payment_details_id]);
      }
      createdPayment.group_id = primaryGroupId;
    }

    return createdPayment;
  }

  /**
   * Update payment info
   */
  static async update(paymentDetailsId, paymentData) {
    const { cardholderName, expiryDate, provider, fundingType, groupId, groupIds } = paymentData;
    
    const targetGroupIds = groupIds && Array.isArray(groupIds) ? groupIds : (groupId ? [groupId] : []);
    const primaryGroupId = targetGroupIds[0] || null;

    const sqlQuery = `
      UPDATE public.payment_info 
      SET 
        cardholder_name = COALESCE($1, cardholder_name), 
        expiry_date = COALESCE($2, expiry_date),
        provider = COALESCE($3, provider),
        funding_type = COALESCE($4, funding_type),
        group_id = COALESCE($5, group_id),
        updated_at = NOW() 
      WHERE payment_details_id = $6
      RETURNING *
    `;
    const result = await query(sqlQuery, [cardholderName, expiryDate, provider, fundingType, primaryGroupId, paymentDetailsId]);
    const updatedPayment = result.rows[0];

    // If groupIds is provided, sync group_payments
    if (groupIds && Array.isArray(groupIds)) {
      // Delete old links NOT in the new list
      if (groupIds.length > 0) {
        await query(`
          DELETE FROM public.group_payments
          WHERE payment_details_id = $1 AND NOT (group_id = ANY($2::uuid[]))
        `, [paymentDetailsId, groupIds]);
      } else {
        await query(`
          DELETE FROM public.group_payments
          WHERE payment_details_id = $1
        `, [paymentDetailsId]);
      }

      // Insert new links
      for (const gid of groupIds) {
        await query(`
          INSERT INTO public.group_payments (group_id, payment_details_id)
          VALUES ($1, $2)
          ON CONFLICT DO NOTHING
        `, [gid, paymentDetailsId]);
      }
    } else if (groupId) {
      await query(`
        INSERT INTO public.group_payments (group_id, payment_details_id)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
      `, [groupId, paymentDetailsId]);
    }

    if (updatedPayment) {
      updatedPayment.group_id = primaryGroupId;
    }
    return updatedPayment;
  }

  /**
   * Delete or unlink a payment info record
   */
  static async delete(paymentDetailsId, userId, groupId = null) {
    if (groupId) {
      // Unlink from this group
      await query('DELETE FROM public.group_payments WHERE group_id = $1 AND payment_details_id = $2', [groupId, paymentDetailsId]);
      
      // Check if it is still referenced by any other group
      const referencedResult = await query('SELECT 1 FROM public.group_payments WHERE payment_details_id = $1', [paymentDetailsId]);
      
      if (referencedResult.rows.length === 0) {
        // Hard delete
        await query('DELETE FROM public.payment_info WHERE payment_details_id = $1 AND user_id = $2', [paymentDetailsId, userId]);
      }
    } else {
      // Hard delete directly
      await query('DELETE FROM public.group_payments WHERE payment_details_id = $1', [paymentDetailsId]);
      await query('DELETE FROM public.payment_info WHERE payment_details_id = $1 AND user_id = $2', [paymentDetailsId, userId]);
    }
    return true;
  }

  /**
   * Enable payment info (restore)
   */
  static async enable(paymentDetailsId, userId) {
    const sqlQuery = 'UPDATE public.payment_info SET is_active = true, updated_at = NOW() WHERE payment_details_id = $1 AND user_id = $2';
    await query(sqlQuery, [paymentDetailsId, userId]);
    return true;
  }
}

export default PaymentInfo
