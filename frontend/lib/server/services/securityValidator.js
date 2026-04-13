import cardValidator from 'card-validator';

/**
 * Security validation for payment information.
 * Performs deep inspection of card numbers and expiry dates using industry standards.
 */
export const validatePaymentSecurity = (paymentData) => {
  const { cardNumber, expiryDate, cvv } = paymentData;

  // 1. Validate Card Number (Luhn check, length check, type detection)
  const numberValidation = cardValidator.number(cardNumber);
  
  // 2. Validate Expiration Date (Format: MM/YY, checked against current date)
  const expirationValidation = cardValidator.expirationDate(expiryDate);

  // 3. Validate CVV (Optional, but included for complete security check)
  const cvvValidation = cvv ? cardValidator.cvv(cvv, numberValidation.card?.code.size) : { isValid: true };

  const errors = [];
  if (!numberValidation.isValid) errors.push('The card number provided is invalid. Please check the digits and try again.');
  if (!expirationValidation.isValid) errors.push('The expiration date is invalid or the card has expired.');
  if (cvv && !cvvValidation.isValid) errors.push('the security code (CVV) provided is incorrect.');

  return {
    isValid: errors.length === 0,
    errors,
    cardMetadata: {
      brand: numberValidation.card?.niceType || 'unknown',
      type: numberValidation.card?.type || 'unknown',
      isPotentiallyValid: numberValidation.isPotentiallyValid,
      bin: cardNumber ? cardNumber.toString().slice(0, 6) : null
    }
  };
};
