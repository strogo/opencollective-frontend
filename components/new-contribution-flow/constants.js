export const STEPS = {
  PROFILE: 'profile',
  DETAILS: 'details',
  PAYMENT: 'payment',
  SUMMARY: 'summary',
};

export const PAYMENT_METHOD_TYPES = {
  STRIPE: 'CREDIT_CARD',
  PAYPAL: 'PAYPAL',
  MANUAL: 'BANK_TRANSFER',
  COLLECTIVE_BALANCE: 'COLLECTIVE',
  PREPAID_BUDGET: 'PREPAID',
  // virtual card and gift card are the same
  VIRTUAL_CARD: 'VIRTUAL_CARD',
};

export const ERROR_MESSAGES = {
  ERROR_LOW_BALANCE: 'lowCollectiveBalance',
  ERROR_DIFFERENT_HOST: 'differentCollectiveHost',
  ERROR_NO_PAYMENT_METHODS: 'noPaymentMethods',
};
