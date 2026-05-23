import type { BondHolding } from 'bonds-domain';
import { isPaymentDateWithinHolding } from 'bonds-domain';

import { FieldValidationError } from '../../middleware/errors.js';

export function assertPaymentDateWithinHoldingOrThrow(
  paymentDate: Date,
  holding: BondHolding
): void {
  if (
    !isPaymentDateWithinHolding(
      paymentDate,
      holding.purchaseDate,
      holding.maturityDate
    )
  ) {
    throw new FieldValidationError(
      {
        paymentDate: [
          'Payment date must be on or after purchase date and on or before maturity date',
        ],
      },
      'Payment date must be within holding purchase and maturity dates'
    );
  }
}
