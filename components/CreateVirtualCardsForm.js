import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { gql } from '@apollo/client';
import { graphql } from '@apollo/client/react/hoc';
import { RadioButtonChecked } from '@styled-icons/material/RadioButtonChecked';
import { RadioButtonUnchecked } from '@styled-icons/material/RadioButtonUnchecked';
import themeGet from '@styled-system/theme-get';
import { get, truncate } from 'lodash';
import memoizeOne from 'memoize-one';
import moment from 'moment';
import { defineMessages, FormattedMessage, injectIntl } from 'react-intl';
import styled from 'styled-components';

import { CollectiveType } from '../lib/constants/collectives';
import { isPrepaid } from '../lib/constants/payment-methods';
import { compose, reportValidityHTML5 } from '../lib/utils';

import CollectivePicker from './CollectivePicker';
import CollectivePickerAsync from './CollectivePickerAsync';
import Container from './Container';
import CreateVirtualCardsSuccess from './CreateVirtualCardsSuccess';
import { Box, Flex } from './Grid';
import { I18nSupportLink } from './I18nFormatters';
import Link from './Link';
import Loading from './Loading';
import MessageBox from './MessageBox';
import PaymentMethodSelect from './PaymentMethodSelect';
import StyledButton from './StyledButton';
import StyledInput from './StyledInput';
import StyledInputAmount from './StyledInputAmount';
import StyledMultiEmailInput from './StyledMultiEmailInput';
import StyledSelectCreatable from './StyledSelectCreatable';
import { H3, P } from './Text';

const MIN_AMOUNT = 500;
const MAX_AMOUNT = 100000000;

const messages = defineMessages({
  emailCustomMessage: {
    id: 'virtualCards.email.customMessage',
    defaultMessage: 'Will be sent in the invitation email',
  },
  limitToHostsPlaceholder: {
    id: 'virtualCards.limitToHosts.placeholder',
    defaultMessage: 'All hosts',
  },
  limitToCollectivesPlaceholder: {
    id: 'virtualCards.limitToCollectives.placeholder',
    defaultMessage:
      'All collectives {nbHosts, plural, =0 {} =1 {under the selected host} other {under the selected hosts}}',
  },
  notBatched: {
    id: 'virtualCards.notBatched',
    defaultMessage: 'Not batched',
  },
});

const InlineField = ({ name, children, label, isLabelClickable }) => (
  <Flex flexWrap="wrap" alignItems="center" mb="2.5em" className={`field-${name}`}>
    <Box width={[1, 0.3]}>
      <label
        htmlFor={`virtualcard-${name}`}
        style={{ cursor: isLabelClickable ? 'pointer' : 'inherit', width: '100%' }}
      >
        {label}
      </label>
    </Box>
    {children}
  </Flex>
);

InlineField.propTypes = {
  name: PropTypes.string,
  children: PropTypes.node,
  label: PropTypes.node,
  isLabelClickable: PropTypes.bool,
};

const Entry = styled.details`
  &[open] {
    summary::after {
      content: '−';
    }
  }

  summary {
    margin-top: ${themeGet('space.2')}px;
    margin-bottom: ${themeGet('space.4')}px;
    font-size: 1.6rem;
    font-weight: 700;
    color: ${themeGet('colors.black.800')};
    /* Remove arrow on Firefox */
    list-style: none;

    &:hover {
      color: ${themeGet('colors.black.700')};
    }
  }

  summary:focus {
    outline: 1px dashed ${themeGet('colors.black.200')};
    outline-offset: ${themeGet('space.1')}px;
  }

  summary::after {
    content: '+';
    display: inline-block;
    padding-left: ${themeGet('space.2')}px;
    color: ${themeGet('colors.black.600')};
    font-weight: bold;
  }

  /* Remove arrow on Chrome */
  summary::-webkit-details-marker {
    display: none;
  }
`;

/** Entry title */
export const Title = styled.summary``;

const DeliverTypeRadioSelector = styled(Flex)`
  justify-content: space-evenly;
  align-items: center;
  padding: 1.25em 1em;
  margin-bottom: 2.5em;
  background: white;
  box-shadow: 0px 3px 10px ${themeGet('colors.black.200')};
  border-top: 1px solid ${themeGet('colors.black.200')};
  border-bottom: 1px solid ${themeGet('colors.black.200')};
`;

const RadioButtonContainer = styled.label`
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  width: auto;
  svg {
    height: 30px;
    width: 30px;
    color: ${themeGet('colors.primary.400')};
    transition: color 0.2s;
    &:hover {
      color: ${themeGet('colors.primary.500')};
    }
  }
`;

const RadioButtonWithLabel = ({ checked, onClick, name, children }) => {
  const icon = checked ? <RadioButtonChecked /> : <RadioButtonUnchecked />;
  return (
    <RadioButtonContainer data-name={name} onClick={onClick}>
      <Box className="radio-btn">{icon}</Box>
      <H3 textAlign="center" px={2} style={{ marginTop: 8 }}>
        {children}
      </H3>
    </RadioButtonContainer>
  );
};

RadioButtonWithLabel.propTypes = {
  checked: PropTypes.bool,
  onClick: PropTypes.func,
  name: PropTypes.string,
  children: PropTypes.node,
};

const FieldLabelDetails = styled.span`
  color: ${themeGet('colors.black.600')};
  font-weight: normal;
`;

class CreateVirtualCardsForm extends Component {
  static propTypes = {
    collectiveId: PropTypes.number.isRequired,
    collectiveSlug: PropTypes.string.isRequired,
    currency: PropTypes.string.isRequired,
    createVirtualCards: PropTypes.func.isRequired,
    collectiveSettings: PropTypes.object.isRequired,
    data: PropTypes.shape({
      loading: PropTypes.bool,
      error: PropTypes.object,
      Collective: PropTypes.shape({
        paymentMethods: PropTypes.array,
      }),
      allHosts: PropTypes.shape({
        collectives: PropTypes.arrayOf(
          PropTypes.shape({
            id: PropTypes.number,
          }),
        ),
      }),
    }),
    /** @ignore from injectIntl */
    intl: PropTypes.object,
  };

  constructor(props) {
    super(props);
    this.form = React.createRef();
    this.onSubmit = this.onSubmit.bind(this);
    this.state = {
      deliverType: 'email', // email or manual
      values: {
        batch: null,
        amount: MIN_AMOUNT,
        emails: [],
        customMessage: '',
        numberOfVirtualCards: 1,
        limitedToHosts: [],
        limitedToCollectives: [],
        expiryDate: moment().add(12, 'months').format('YYYY-MM-DD'),
      },
      errors: { emails: [] },
      multiEmailsInitialState: null,
      submitting: false,
      createdVirtualCards: null,
      serverError: null,
    };
  }

  onChange(fieldName, value) {
    const errors = {};

    // Format value
    if (fieldName === 'emails') {
      const { emails, invalids } = value;
      value = emails;
      errors.emails = invalids;
    } else if (fieldName === 'numberOfVirtualCards') {
      const intNumberOfVirtualCards = parseInt(value);
      value = !isNaN(intNumberOfVirtualCards) ? intNumberOfVirtualCards : 1;
    }

    // Set value
    this.setState(state => ({
      values: Object.assign(state.values, { [fieldName]: value }),
      errors: Object.assign(state.errors, errors),
    }));
  }

  isSubmitEnabled() {
    // Others fields validity are checked with HTML5 validation (see `onSubmit`)
    const { values, errors, deliverType } = this.state;

    if (deliverType === 'email') {
      return values.emails.length > 0 && errors.emails.length == 0;
    } else {
      return values.numberOfVirtualCards !== 0;
    }
  }

  onSubmit(e) {
    e.preventDefault();
    const { values, submitting, deliverType } = this.state;
    if (!submitting && reportValidityHTML5(this.form.current)) {
      const paymentMethod = values.paymentMethod || this.getDefaultPaymentMethod();
      const limitations = {};
      if (this.canLimitToCollectives(paymentMethod)) {
        limitations.limitedToHostCollectiveIds = this.optionsToIdsList(values.limitedToHosts);
        limitations.limitedToCollectiveIds = this.optionsToIdsList(values.limitedToCollectives);
      }

      this.setState({ submitting: true });
      const variables = {
        CollectiveId: this.props.collectiveId,
        amount: values.amount,
        PaymentMethodId: paymentMethod.id,
        expiryDate: values.expiryDate,
        batch: values.batch,
        ...limitations,
      };

      if (deliverType === 'email') {
        variables.emails = values.emails;
        variables.customMessage = values.customMessage;
      } else if (deliverType === 'manual') {
        variables.numberOfVirtualCards = values.numberOfVirtualCards;
      }

      this.props
        .createVirtualCards({ variables })
        .then(({ data }) => {
          this.setState({ createdVirtualCards: data.createVirtualCards, submitting: false });
          window.scrollTo(0, 0);
        })
        .catch(e => {
          this.setState({ serverError: e.message, submitting: false });
        });
    }
  }

  getDefaultPaymentMethod() {
    return get(this.props, 'data.Collective.paymentMethods', [])[0];
  }

  getError(fieldName) {
    return this.state.errors[fieldName];
  }

  changeDeliverType(deliverType) {
    this.setState(state => {
      // Use the emails count to pre-fill the number count
      const values = { ...state.values };
      if (state.deliverType === 'email' && deliverType === 'manual' && values.emails.length) {
        values.numberOfVirtualCards = values.emails.length;
      }
      return { values, deliverType };
    });
  }

  renderSubmit() {
    const { submitting, values, deliverType } = this.state;
    const count = deliverType === 'email' ? values.emails.length : values.numberOfVirtualCards;
    const enable = this.isSubmitEnabled();
    return (
      <StyledButton
        type="submit"
        buttonSize="large"
        buttonStyle="primary"
        minWidth="16em"
        disabled={!submitting && !enable}
        loading={submitting}
        data-cy="submit-new-virtualcards"
      >
        <FormattedMessage id="virtualCards.generate" defaultMessage="Create {count} gift cards" values={{ count }} />
      </StyledButton>
    );
  }

  renderNoPaymentMethodMessage() {
    return (
      <Flex justifyContent="center">
        <Link route="editCollective" params={{ slug: this.props.collectiveSlug, section: 'payment-methods' }}>
          <StyledButton buttonSize="large" mt="2em" justifyContent="center">
            <FormattedMessage
              id="virtualCards.create.requirePM"
              defaultMessage="You must add a payment method to your account to create gift cards"
            />
          </StyledButton>
        </Link>
      </Flex>
    );
  }

  renderEmailFields() {
    const { submitting, errors, multiEmailsInitialState } = this.state;
    const { collectiveSettings } = this.props;
    return (
      <Box>
        <P>
          <FormattedMessage
            id="VirtualCard.Limitinfo"
            defaultMessage="Your account is currently limited to {limit} gift cards / day. If you want to increase that limit, please contact <SupportLink></SupportLink>."
            values={{
              SupportLink: I18nSupportLink,
              limit: get(collectiveSettings, `virtualCardsMaxDailyCount`) || 100,
            }}
          />
        </P>
        <Flex flexDirection="column" mb="2em">
          <label style={{ width: '100%' }}>
            <Flex flexDirection="column">
              <FormattedMessage id="virtualCards.create.recipients" defaultMessage="Recipients" />
              <FieldLabelDetails>
                <FormattedMessage
                  id="virtualCards.create.recipientsDetails"
                  defaultMessage="A list of emails that will receive a gift card"
                />
              </FieldLabelDetails>
            </Flex>
          </label>
          <StyledMultiEmailInput
            className="virtualcards-recipients"
            mt="0.25em"
            invalids={errors.emails}
            initialState={multiEmailsInitialState}
            onClose={s => this.setState({ multiEmailsInitialState: s })}
            onChange={value => this.onChange('emails', value)}
            disabled={submitting}
          />
        </Flex>
        <InlineField
          name="customMessage"
          label={
            <Flex flexDirection="column">
              <FormattedMessage id="virtualCards.create.customMessage" defaultMessage="Custom message" />
              <FieldLabelDetails>
                <FormattedMessage id="forms.optional" defaultMessage="Optional" />
              </FieldLabelDetails>
            </Flex>
          }
        >
          <StyledInput
            id="virtualcard-customMessage"
            type="text"
            maxLength="255"
            placeholder={this.props.intl.formatMessage(messages.emailCustomMessage)}
            onChange={e => this.onChange('customMessage', e.target.value)}
            style={{ flexGrow: 1 }}
            disabled={submitting}
          />
        </InlineField>
      </Box>
    );
  }

  renderManualFields() {
    const { collectiveSettings } = this.props;
    const virtualCardsMaxDailyCount = get(collectiveSettings, `virtualCardsMaxDailyCount`) || 100;
    return (
      <Container display="flex" flexDirection="column" width={1} justifyContent="center">
        <P>
          <FormattedMessage
            id="VirtualCard.Limitinfo"
            defaultMessage="Your account is currently limited to {limit} gift cards / day. If you want to increase that limit, please contact <SupportLink></SupportLink>."
            values={{
              SupportLink: I18nSupportLink,
              limit: virtualCardsMaxDailyCount,
            }}
          />
        </P>
        <Flex justifyContent="center" mt={4} mb={3}>
          <H3 mr="1em">
            <FormattedMessage id="virtualCards.create.number" defaultMessage="Number of gift cards" />
          </H3>
          <StyledInput
            id="virtualcard-numberOfVirtualCards"
            type="number"
            step="1"
            min="1"
            max={virtualCardsMaxDailyCount}
            maxWidth="6.5em"
            onChange={e => this.onChange('numberOfVirtualCards', e.target.value)}
            value={this.state.values.numberOfVirtualCards}
            disabled={this.state.submitting}
          />
        </Flex>
      </Container>
    );
  }

  optionsToIdsList(options) {
    return options ? options.map(({ value }) => value.id) : [];
  }

  canLimitToCollectives(paymentMethod) {
    return !isPrepaid(paymentMethod);
  }

  /** Get batch options for select. First option is always "No batch" */
  getBatchesOptions = memoizeOne((batches, intl) => {
    const noBatchOption = { label: intl.formatMessage(messages.notBatched), value: null };
    if (!batches) {
      return [noBatchOption];
    } else {
      return [
        noBatchOption,
        ...batches.filter(b => b.name !== null).map(batch => ({ label: batch.name, value: batch.name })),
      ];
    }
  });

  render() {
    const { data, intl, collectiveSlug, currency } = this.props;
    const { submitting, values, createdVirtualCards, serverError, deliverType } = this.state;
    const loading = get(data, 'loading');
    const error = get(data, 'error');
    const paymentMethods = get(data, 'Collective.paymentMethods', []);
    const batches = get(data, 'Collective.virtualCardsBatches');
    const hosts = get(data, 'allHosts.collectives', []);
    const canLimitToCollectives = this.canLimitToCollectives(values.paymentMethod);
    const batchesOptions = this.getBatchesOptions(batches, intl);

    if (loading) {
      return <Loading />;
    } else if (error) {
      return (
        <MessageBox type="error" withIcon>
          {error.message}
        </MessageBox>
      );
    } else if (paymentMethods.length === 0) {
      return this.renderNoPaymentMethodMessage();
    } else if (createdVirtualCards) {
      return (
        <CreateVirtualCardsSuccess
          cards={createdVirtualCards}
          deliverType={deliverType}
          collectiveSlug={collectiveSlug}
        />
      );
    }

    return (
      <form ref={this.form} onSubmit={this.onSubmit}>
        <Flex flexDirection="column">
          <InlineField name="amount" label={<FormattedMessage id="Fields.amount" defaultMessage="Amount" />}>
            <StyledInputAmount
              id="virtualcard-amount"
              currency={currency}
              prepend={currency}
              onChange={value => this.onChange('amount', value)}
              error={this.getError('amount')}
              value={values.amount}
              min={MIN_AMOUNT}
              max={MAX_AMOUNT}
              disabled={submitting}
              required
            />
          </InlineField>

          <InlineField
            name="paymentMethod"
            label={<FormattedMessage id="paymentmethod.label" defaultMessage="Payment Method" />}
          >
            <PaymentMethodSelect
              disabled={submitting}
              paymentMethods={paymentMethods}
              defaultPaymentMethod={this.getDefaultPaymentMethod()}
              onChange={pm => this.onChange('paymentMethod', pm)}
            />
          </InlineField>

          <InlineField
            name="expiryDate"
            isLabelClickable
            label={<FormattedMessage id="virtualCards.create.expiryDate" defaultMessage="Expiry date" />}
          >
            <StyledInput
              id="virtualcard-expiryDate"
              name="expiryDate"
              value={values.expiryDate}
              onChange={e => this.onChange('expiryDate', e.target.value)}
              type="date"
              required
              min={moment().add(1, 'day').format('YYYY-MM-DD')}
            />
          </InlineField>

          <InlineField
            name="batch"
            label={
              <Flex flexDirection="column">
                <FormattedMessage id="virtualCards.batch" defaultMessage="Batch name" />
                <FieldLabelDetails>
                  <FormattedMessage id="forms.optional" defaultMessage="Optional" />
                </FieldLabelDetails>
              </Flex>
            }
          >
            <StyledSelectCreatable
              id="virtualcard-batch"
              onChange={({ value }) => this.onChange('batch', truncate(value, { length: 200 }))}
              minWidth={300}
              disabled={submitting}
              fontSize="Paragraph"
              options={batchesOptions}
              defaultValue={batchesOptions[0]}
            />
          </InlineField>

          {canLimitToCollectives && (
            <React.Fragment>
              <Entry>
                <Title>Limitations</Title>
                <InlineField
                  name="limitToHosts"
                  label={
                    <Flex flexDirection="column">
                      <FormattedMessage
                        id="virtualCards.create.limitToHosts"
                        defaultMessage="Limit to the following hosts"
                      />
                      <FieldLabelDetails>
                        <FormattedMessage id="forms.optional" defaultMessage="Optional" />
                      </FieldLabelDetails>
                    </Flex>
                  }
                >
                  <CollectivePicker
                    placeholder={intl.formatMessage(messages.limitToHostsPlaceholder)}
                    disabled={hosts.length === 0}
                    minWidth={300}
                    maxWidth={600}
                    sortFunc={collectives => collectives} /** Sort is handled by the API */
                    groupByType={false}
                    collectives={hosts}
                    defaultValue={values.limitedToHosts}
                    onChange={options => this.onChange('limitedToHosts', options)}
                    isMulti
                  />
                </InlineField>

                <InlineField
                  name="limitToCollectives"
                  label={
                    <Flex flexDirection="column">
                      <FormattedMessage
                        id="virtualCards.create.limitToCollectives"
                        defaultMessage="Limit to the following collectives"
                      />
                      <FieldLabelDetails>
                        <FormattedMessage id="forms.optional" defaultMessage="Optional" />
                      </FieldLabelDetails>
                    </Flex>
                  }
                >
                  <CollectivePickerAsync
                    isMulti
                    minWidth={300}
                    maxWidth={600}
                    preload={values.limitedToHosts.length > 0}
                    sortFunc={collectives => collectives} /** Sort is handled by the API */
                    types={[CollectiveType.COLLECTIVE]}
                    defaultValue={values.limitedToCollectives}
                    onChange={options => this.onChange('limitedToCollectives', options)}
                    hostCollectiveIds={this.optionsToIdsList(values.limitedToHosts)}
                    placeholder={intl.formatMessage(messages.limitToCollectivesPlaceholder, {
                      nbHosts: values.limitedToHosts.length,
                    })}
                  />
                </InlineField>
              </Entry>
            </React.Fragment>
          )}

          <DeliverTypeRadioSelector className="deliver-type-selector">
            <RadioButtonWithLabel
              name="email"
              checked={deliverType === 'email'}
              onClick={() => this.changeDeliverType('email')}
            >
              <FormattedMessage id="virtualCards.create.sendEmails" defaultMessage="Send the cards by&#160;email" />
            </RadioButtonWithLabel>
            <RadioButtonWithLabel
              name="manual"
              checked={deliverType === 'manual'}
              onClick={() => this.changeDeliverType('manual')}
            >
              <FormattedMessage id="virtualCards.create.generateCodes" defaultMessage="I'll send the codes myself" />
            </RadioButtonWithLabel>
          </DeliverTypeRadioSelector>

          {/* Show different fields based on deliver type */}
          {deliverType === 'email' && this.renderEmailFields()}
          {deliverType === 'manual' && this.renderManualFields()}

          {serverError && (
            <MessageBox type="error" withIcon>
              {serverError}
            </MessageBox>
          )}

          <Box mb="1em" alignSelf="center" mt={3}>
            {this.renderSubmit()}
          </Box>
        </Flex>
      </form>
    );
  }
}

/**
 * A query to get a collective source payment methods. This will not return
 * virtual cards, as a virtual card cannot be used as a source payment method
 * for another payment method.
 */
export const collectiveSourcePaymentMethodsQuery = gql`
  query CollectiveSourcePaymentMethods($id: Int) {
    Collective(id: $id) {
      id
      virtualCardsBatches {
        id
        name
        count
      }
      paymentMethods(types: ["creditcard", "prepaid"], hasBalanceAboveZero: true) {
        id
        uuid
        name
        data
        monthlyLimitPerMember
        service
        type
        balance
        currency
        expiryDate
        batch
      }
    }
    allHosts(limit: 100, onlyOpenHosts: false, minNbCollectivesHosted: 1) {
      collectives {
        id
        type
        name
        slug
        imageUrl
      }
    }
  }
`;

const addCollectiveSourcePaymentMethodsQuery = graphql(collectiveSourcePaymentMethodsQuery, {
  options: props => ({
    variables: { id: props.collectiveId },
    fetchPolicy: 'network-only',
  }),
});

const createVirtualCardsMutation = gql`
  mutation CreateVirtualCards(
    $CollectiveId: Int!
    $numberOfVirtualCards: Int
    $emails: [String]
    $PaymentMethodId: Int
    $amount: Int
    $monthlyLimitPerMember: Int
    $description: String
    $expiryDate: String
    $currency: String
    $limitedToTags: [String]
    $limitedToCollectiveIds: [Int]
    $limitedToHostCollectiveIds: [Int]
    $customMessage: String
    $batch: String
  ) {
    createVirtualCards(
      amount: $amount
      monthlyLimitPerMember: $monthlyLimitPerMember
      CollectiveId: $CollectiveId
      PaymentMethodId: $PaymentMethodId
      description: $description
      expiryDate: $expiryDate
      currency: $currency
      limitedToTags: $limitedToTags
      limitedToCollectiveIds: $limitedToCollectiveIds
      limitedToHostCollectiveIds: $limitedToHostCollectiveIds
      numberOfVirtualCards: $numberOfVirtualCards
      emails: $emails
      customMessage: $customMessage
      batch: $batch
    ) {
      id
      name
      uuid
      batch
      limitedToHostCollectiveIds
      limitedToCollectiveIds
      description
      initialBalance
      monthlyLimitPerMember
      expiryDate
      currency
      data
    }
  }
`;

const addCreateVirtualCardsMutation = graphql(createVirtualCardsMutation, {
  name: 'createVirtualCards',
});

const addGraphql = compose(addCollectiveSourcePaymentMethodsQuery, addCreateVirtualCardsMutation);

export default injectIntl(addGraphql(CreateVirtualCardsForm));
