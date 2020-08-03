import React from 'react';
import * as LibTaxes from '@opencollective/taxes';
import { get, uniqBy } from 'lodash';
import { FormattedMessage } from 'react-intl';

import { CollectiveType } from '../../lib/constants/collectives';
import { VAT_OPTIONS } from '../../lib/constants/vat';
import { getPaymentMethodName } from '../../lib/payment_method_label';
import { getPaymentMethodIcon, getPaymentMethodMetadata } from '../../lib/payment-method-utils';

import CreditCardInactive from '../../components/icons/CreditCardInactive';

import { ERROR_MESSAGES, PAYMENT_METHOD_TYPES } from './constants';

/** Returns true if taxes may apply with this tier/host */
export const taxesMayApply = (collective, host, tier) => {
  if (!tier) {
    return false;
  }

  // Don't apply VAT if not configured (default)
  const vatType = get(collective, 'settings.VAT.type') || get(collective, 'parent.settings.VAT.type');
  const hostCountry = get(host.location, 'country');
  const collectiveCountry = get(collective.location, 'country');
  const parentCountry = get(collective, 'parent.location.country');
  const country = collectiveCountry || parentCountry || hostCountry;

  if (!vatType) {
    return false;
  } else if (vatType === VAT_OPTIONS.OWN) {
    return LibTaxes.getVatOriginCountry(tier.type, country, country);
  } else {
    return LibTaxes.getVatOriginCountry(tier.type, hostCountry, country);
  }
};

export const generatePaymentMethodOptions = (
  paymentMethods,
  supportedPaymentMethods,
  stepProfile,
  stepDetails,
  collective,
) => {
  const minBalance = 50; // Minimum usable balance for virtual card and collective to collective

  const hostHasManual = supportedPaymentMethods.includes(PAYMENT_METHOD_TYPES.MANUAL);
  const hostHasPaypal = supportedPaymentMethods.includes(PAYMENT_METHOD_TYPES.PAYPAL);
  const hostHasStripe = supportedPaymentMethods.includes(PAYMENT_METHOD_TYPES.STRIPE);

  const paymentMethodsOptions = paymentMethods.map(pm => ({
    key: `pm-${pm.id}`,
    title: getPaymentMethodName(pm),
    subtitle: getPaymentMethodMetadata(pm),
    icon: getPaymentMethodIcon(pm),
    paymentMethod: pm,
    disabled: pm.balance.value < minBalance,
    id: pm.id,
    CollectiveId: pm.account.id,
    type: pm.type,
    limitedToHostCollectiveIds: pm.limitedToHostCollectiveIds || null,
    limitedToCollectiveIds: pm.limitedToCollectiveIds || null,
    data: pm.data || null,
  }));

  let uniquePMs = uniqBy(paymentMethodsOptions, 'id');

  if (stepProfile.type === CollectiveType.COLLECTIVE) {
    // collective to collective balance: only if they are on the same host
    const hostCollectiveId = get(collective, 'host.legacyId');
    const stepProfileHostCollectiveId = get(stepProfile, 'host.id');
    const collectivesHaveSameHost = hostCollectiveId === stepProfileHostCollectiveId;
    if (stepProfile.type === CollectiveType.COLLECTIVE && !collectivesHaveSameHost) {
      throw new Error(ERROR_MESSAGES.ERROR_DIFFERENT_HOST);
    }

    // if the chosen collective balance is too low, throw error
    uniquePMs.find(pm => {
      if (pm.type === 'collective' && pm.disabled) {
        throw new Error(ERROR_MESSAGES.ERROR_LOW_BALANCE);
      }
    });
  }

  // if ORG filter out 'collective' type payment
  if (stepProfile.type === CollectiveType.ORGANIZATION) {
    uniquePMs = uniquePMs.filter(pm => pm.type !== 'collective');
  }

  // prepaid budget: limited to a specific host
  const matchesHostCollectiveIdPrepaid = prepaid => {
    const hostCollectiveLegacyId = get(collective, 'host.legacyId');
    const prepaidHostCollectiveId = get(prepaid, 'data.HostCollectiveId');
    return prepaidHostCollectiveId === hostCollectiveLegacyId;
  };

  uniquePMs = uniquePMs.filter(pm => {
    if (pm.type === 'prepaid') {
      return matchesHostCollectiveIdPrepaid(pm);
    } else {
      return pm;
    }
  });

  // gift card: can be limited to a specific host, see limitedToHostCollectiveIds
  const matchesHostCollectiveId = giftcard => {
    const hostCollectiveId = get(collective, 'host.id');
    const giftcardLimitedToHostCollectiveIds = get(giftcard, 'limitedToHostCollectiveIds');
    return giftcardLimitedToHostCollectiveIds.includes(hostCollectiveId);
  };

  uniquePMs = uniquePMs.filter(pm => {
    if (pm.type === 'virtualcard' && pm.limitedToHostCollectiveIds) {
      return matchesHostCollectiveId(pm);
    } else {
      return pm;
    }
  });

  // adding payment methods
  if (stepProfile.type !== CollectiveType.COLLECTIVE) {
    if (hostHasStripe) {
      // New credit card
      uniquePMs.push({
        key: 'newCreditCard',
        title: <FormattedMessage id="contribute.newcreditcard" defaultMessage="New credit/debit card" />,
        icon: <CreditCardInactive />,
      });
    }

    // Paypal
    if (hostHasPaypal) {
      uniquePMs.push({
        key: 'paypal',
        title: 'PayPal',
        paymentMethod: { service: 'paypal', type: 'payment' },
        icon: getPaymentMethodIcon({ service: 'paypal', type: 'payment' }, collective),
      });
    }

    // Manual (bank transfer)
    const interval = get(stepDetails, 'interval', null);
    if (hostHasManual && !interval) {
      uniquePMs.push({
        key: 'manual',
        title: get(collective, 'host.settings.paymentMethods.manual.title', null) || 'Bank transfer',
        paymentMethod: { type: 'manual' },
        icon: getPaymentMethodIcon({ type: 'manual' }, collective),
        instructions: get(collective, 'host.settings.paymentMethods.manual.instructions', null),
      });
    }
  }

  if (!hostHasStripe) {
    uniquePMs = uniquePMs.filter(pm => pm.type !== 'creditcard');
  }

  if (!uniquePMs.length) {
    throw new Error(ERROR_MESSAGES.ERROR_NO_PAYMENT_METHODS);
  }

  return uniquePMs;
};
