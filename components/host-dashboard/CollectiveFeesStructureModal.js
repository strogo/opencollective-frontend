import React from 'react';
import PropTypes from 'prop-types';
import { useMutation } from '@apollo/client';
import { isNil, round } from 'lodash';
import { defineMessages, FormattedMessage, useIntl } from 'react-intl';

import { HOST_FEE_STRUCTURE } from '../../lib/constants/host-fee-structure';
import { API_V2_CONTEXT, gqlV2 } from '../../lib/graphql/helpers';

import { EDIT_COLLECTIVE_SECTIONS } from '../edit-collective/Menu';
import { Box, Flex } from '../Grid';
import { getI18nLink } from '../I18nFormatters';
import Link from '../Link';
import MessageBoxGraphqlError from '../MessageBoxGraphqlError';
import StyledButton from '../StyledButton';
import StyledInputGroup from '../StyledInputGroup';
import StyledModal, { CollectiveModalHeader, ModalBody, ModalFooter } from '../StyledModal';
import StyledRadioList from '../StyledRadioList';
import { P } from '../Text';

const OPTION_LABELS = defineMessages({
  [HOST_FEE_STRUCTURE.DEFAULT]: {
    id: 'CollectiveFeesForm.Default',
    defaultMessage: 'Use global host fees',
  },
  [HOST_FEE_STRUCTURE.CUSTOM_FEE]: {
    id: 'CollectiveFeesForm.CustomFees',
    defaultMessage: 'Set custom fee for this Collective only.',
  },
});

const getDefaultFee = (collective, host) => {
  if (isNil(collective.hostFeePercent) || collective.hostFeePercent === host.hostFeePercent) {
    return host.hostFeePercent;
  } else {
    return collective.hostFeePercent;
  }
};

const editAccountFeeStructureMutation = gqlV2/* GraphQL */ `
  mutation EditAccountFeesStructure($account: AccountReferenceInput!, $hostFeePercent: Float!) {
    editAccountFeeStructure(account: $account, hostFeePercent: $hostFeePercent) {
      id
      ... on Collective {
        hostFeesStructure
        hostFeePercent
      }
      ... on Fund {
        hostFeesStructure
        hostFeePercent
      }
      ... on Event {
        hostFeesStructure
        hostFeePercent
      }
      ... on Project {
        hostFeesStructure
        hostFeePercent
      }
    }
  }
`;

const CollectiveFeesStructureModal = ({ host, collective, ...props }) => {
  const intl = useIntl();
  const [hostFeePercent, setHostFeePercent] = React.useState(getDefaultFee(collective, host));
  const [selectedOption, setSelectedOption] = React.useState(
    hostFeePercent === host.hostFeePercent ? HOST_FEE_STRUCTURE.DEFAULT : HOST_FEE_STRUCTURE.CUSTOM_FEE,
  );
  const [submitFeesStructure, { loading, error }] = useMutation(editAccountFeeStructureMutation, {
    context: API_V2_CONTEXT,
  });

  return (
    <StyledModal show maxWidth={432} {...props}>
      <CollectiveModalHeader collective={collective} mb={3} />
      <ModalBody>
        <P fontSize="16px" lineHeight="24px" fontWeight="500" mb={2}>
          <FormattedMessage id="CollectiveFeesForm.Title" defaultMessage="Set fees structure" />
        </P>
        <P color="black.700" fontSize="14px" lineHeight="21px">
          <FormattedMessage
            id="CollectiveFeesForm.Description"
            defaultMessage="This helps you to set different fees per Collective if you need it. You may want to set the fee at 0% for in-house projects, or set a monthly retainer instead of a fee."
          />
        </P>

        <StyledRadioList
          id="fees-structure-radio"
          name="fees-structure-radio"
          options={[HOST_FEE_STRUCTURE.DEFAULT, HOST_FEE_STRUCTURE.CUSTOM_FEE]}
          value={selectedOption}
          onChange={({ value }) => setSelectedOption(value)}
        >
          {({ key, radio }) => (
            <Flex key={key} mt={3}>
              <Box mr={12}>{radio}</Box>
              <Box>
                <P mb={2} fontWeight="500">
                  {intl.formatMessage(OPTION_LABELS[key])}
                </P>
                {key === HOST_FEE_STRUCTURE.DEFAULT && (
                  <P fontSize="11px" lineHeight="16px" color="black.600" fontWeight="normal">
                    <FormattedMessage
                      id="CollectiveFeesForm.DefaultDescription"
                      defaultMessage="You set this global fee for all Collectives hosted using <Link>settings</Link>."
                      values={{
                        Link: getI18nLink({
                          as: Link,
                          route: 'editCollective',
                          params: { slug: host.slug, section: EDIT_COLLECTIVE_SECTIONS.FISCAL_HOSTING },
                          openInNewTab: true,
                        }),
                      }}
                    />
                  </P>
                )}
                {key === HOST_FEE_STRUCTURE.CUSTOM_FEE && (
                  <StyledInputGroup
                    append="%"
                    type="number"
                    min="0"
                    max="100"
                    maxWidth={90}
                    appendProps={{ color: 'black.600' }}
                    fontWeight="normal"
                    value={hostFeePercent}
                    step="0.01"
                    onChange={e => setHostFeePercent(e.target.value)}
                    onBlur={e => {
                      const newValue = round(parseFloat(e.target.value), 2);
                      setHostFeePercent(isNaN(newValue) ? host.hostFeePercent : newValue);
                    }}
                  />
                )}
              </Box>
            </Flex>
          )}
        </StyledRadioList>
        {error && <MessageBoxGraphqlError error={error} mt={3} fontSize="13px" />}
      </ModalBody>
      <ModalFooter>
        <Flex justifyContent="center">
          <StyledButton
            buttonStyle="primary"
            minWidth={90}
            loading={loading}
            onClick={() => {
              const isCustomFee = selectedOption === HOST_FEE_STRUCTURE.CUSTOM_FEE;
              return submitFeesStructure({
                variables: {
                  account: { id: collective.id },
                  hostFeePercent: isCustomFee ? hostFeePercent : host.hostFeePercent,
                },
              }).then(props.onClose);
            }}
          >
            <FormattedMessage id="save" defaultMessage="Save" />
          </StyledButton>
          <StyledButton ml={3} minWidth={90} onClick={props.onClose} disabled={loading}>
            <FormattedMessage id="actions.cancel" defaultMessage="Cancel" />
          </StyledButton>
        </Flex>
      </ModalFooter>
    </StyledModal>
  );
};

CollectiveFeesStructureModal.propTypes = {
  onClose: PropTypes.func,
  collective: PropTypes.shape({
    id: PropTypes.string,
    hostFeePercent: PropTypes.number,
  }).isRequired,
  host: PropTypes.shape({
    slug: PropTypes.string,
    hostFeePercent: PropTypes.number,
  }).isRequired,
};

export default CollectiveFeesStructureModal;
