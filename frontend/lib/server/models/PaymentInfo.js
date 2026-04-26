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
    const sqlQuery = 'SELECT * FROM public.payment_info WHERE group_id = $1';
    const result = await query(sqlQuery, [groupId]);
    return result.rows || [];
  }

  /**
   * Create a new payment info record
   */
  static async create(paymentData) {
    const { 
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
      groupId, 
      userId, 
      cardholderName, 
      cardNumber, 
      expiryDate, 
      provider,
      cardBrand,
      fundingType,
      isVerified
    ]);
    return result.rows[0];
  }

  /**
   * Update payment info
   */
  static async update(paymentDetailsId, userId, paymentData) {
    const { cardholderName, expiryDate } = paymentData;
    const sqlQuery = `
      UPDATE public.payment_info 
      SET 
        cardholder_name = COALESCE($1, cardholder_name), 
        expiry_date = COALESCE($2, expiry_date), 
        updated_at = NOW() 
      WHERE payment_details_id = $3 AND user_id = $4
      RETURNING *
    `;
    const result = await query(sqlQuery, [cardholderName, expiryDate, paymentDetailsId, userId]);
    return result.rows[0];
  }

  /**
   * Hard delete payment info
   */
  static async delete(paymentDetailsId, userId) {
    const sqlQuery = 'DELETE FROM public.payment_info WHERE payment_details_id = $1 AND user_id = $2';
    await query(sqlQuery, [paymentDetailsId, userId]);
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
