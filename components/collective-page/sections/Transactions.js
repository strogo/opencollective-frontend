import React from 'react';
import PropTypes from 'prop-types';
import { gql } from '@apollo/client';
import { graphql } from '@apollo/client/react/hoc';
import { orderBy } from 'lodash';
import memoizeOne from 'memoize-one';
import { defineMessages, FormattedMessage, injectIntl } from 'react-intl';

import { Dimensions } from '../_constants';
import BudgetItemsList, {
  budgetItemExpenseFragment,
  budgetItemExpenseTypeFragment,
  budgetItemOrderFragment,
} from '../../budget/BudgetItemsList';
import { Box } from '../../Grid';
import Link from '../../Link';
import LoadingPlaceholder from '../../LoadingPlaceholder';
import MessageBox from '../../MessageBox';
import StyledButton from '../../StyledButton';
import StyledFilters from '../../StyledFilters';
import ContainerSectionContent from '../ContainerSectionContent';
import SectionTitle from '../SectionTitle';

const NB_DISPLAYED = 10;
const FILTERS = { ALL: 'ALL', EXPENSES: 'EXPENSES', CONTRIBUTIONS: 'CONTRIBUTIONS' };
const FILTERS_LIST = Object.values(FILTERS);
const I18nFilters = defineMessages({
  [FILTERS.ALL]: {
    id: 'SectionTransactions.All',
    defaultMessage: 'All',
  },
  [FILTERS.EXPENSES]: {
    id: 'section.expenses.title',
    defaultMessage: 'Expenses',
  },
  [FILTERS.CONTRIBUTIONS]: {
    id: 'Contributions',
    defaultMessage: 'Contributions',
  },
});

class SectionTransactions extends React.Component {
  static propTypes = {
    /** Collective */
    collective: PropTypes.shape({
      id: PropTypes.number.isRequired,
      name: PropTypes.string.isRequired,
      slug: PropTypes.string.isRequired,
      currency: PropTypes.string.isRequired,
      platformFeePercent: PropTypes.number,
    }).isRequired,

    /** Wether user is admin of `collective` */
    isAdmin: PropTypes.bool,

    /** Wether user is root user */
    isRoot: PropTypes.bool,

    /** @ignore from withData */
    data: PropTypes.shape({
      loading: PropTypes.bool,
      refetch: PropTypes.func,
      /** Expenses paid + refunds */
      contributions: PropTypes.arrayOf(
        PropTypes.shape({
          id: PropTypes.number.isRequired,
          amount: PropTypes.number.isRequired,
          createdAt: PropTypes.string.isRequired,
          type: PropTypes.string.isRequired,
          description: PropTypes.string,
          fromcollective: PropTypes.shape({
            id: PropTypes.number.isRequired,
            name: PropTypes.string.isRequired,
            slug: PropTypes.string.isRequired,
            type: PropTypes.string.isRequired,
            imageUrl: PropTypes.string,
            isIncognito: PropTypes.bool,
          }),
          usingVirtualCardFromCollective: PropTypes.shape({
            id: PropTypes.number.isRequired,
            name: PropTypes.string.isRequired,
            slug: PropTypes.string.isRequired,
            type: PropTypes.string.isRequired,
          }),
        }),
      ),
      /** Financial contributions */
      expenses: PropTypes.shape({
        entries: PropTypes.arrayOf(
          PropTypes.shape({
            id: PropTypes.number.isRequired,
            amount: PropTypes.number.isRequired,
            description: PropTypes.string.isRequired,
            createdAt: PropTypes.string.isRequired,
            transaction: PropTypes.shape({
              id: PropTypes.number,
            }),
            fromCollective: PropTypes.shape({
              id: PropTypes.number,
              slug: PropTypes.string.isRequired,
              name: PropTypes.string.isRequired,
              imageUrl: PropTypes.string,
              isIncognito: PropTypes.bool,
            }).isRequired,
          }),
        ),
      }),
    }),

    /** @ignore from injectIntl */
    intl: PropTypes.object,
  };

  state = { filter: FILTERS.ALL };

  componentDidUpdate(oldProps) {
    // If users just logged in (or logged  out), refetch the data so we can get the transactions
    // `uuid` that will make it possible for them to download the expenses.
    const hadAccess = oldProps.isAdmin || oldProps.isRoot;
    const hasAccess = this.props.isAdmin || this.props.isRoot;
    if (hadAccess !== hasAccess) {
      this.props.data.refetch();
    }
  }

  getBudgetItems = memoizeOne((contributions, expenses, filter) => {
    if (filter === FILTERS.EXPENSES) {
      return expenses;
    } else if (filter === FILTERS.CONTRIBUTIONS) {
      return contributions;
    } else {
      return orderBy([...contributions, ...expenses], t => new Date(t.createdAt), ['desc']).slice(0, NB_DISPLAYED);
    }
  });

  render() {
    const { data, intl, collective, isAdmin, isRoot } = this.props;
    const { filter } = this.state;
    let showFilters = true;

    if (!data || data.loading) {
      return <LoadingPlaceholder height={600} borderRadius={0} />;
    }

    const contributions = data.contributions || [];
    const expenses = (data.expenses && data.expenses.entries) || [];
    if (contributions.length === 0 && expenses.length === 0) {
      return (
        <ContainerSectionContent pt={5} pb={6}>
          <SectionTitle mb={4} fontSize={['H4', 'H2']}>
            <FormattedMessage id="SectionTransactions.Title" defaultMessage="Transactions" />
          </SectionTitle>
          <MessageBox type="info" withIcon>
            <FormattedMessage id="SectionTransactions.Empty" defaultMessage="No transaction yet." />
          </MessageBox>
        </ContainerSectionContent>
      );
    } else if (contributions.length === 0 || expenses.length === 0) {
      showFilters = false;
    }

    const budgetItems = this.getBudgetItems(contributions, expenses, filter);
    return (
      <Box py={5}>
        <ContainerSectionContent>
          <SectionTitle data-cy="section-transactions-title" mb={4} textAlign="left">
            <FormattedMessage id="SectionTransactions.Title" defaultMessage="Transactions" />
          </SectionTitle>
        </ContainerSectionContent>
        {showFilters && (
          <Box mb={3} maxWidth={Dimensions.MAX_SECTION_WIDTH} mx="auto">
            <StyledFilters
              filters={FILTERS_LIST}
              selected={this.state.filter}
              onChange={filter => this.setState({ filter })}
              getLabel={filter => intl.formatMessage(I18nFilters[filter])}
              minButtonWidth={180}
              px={Dimensions.PADDING_X}
            />
          </Box>
        )}

        <ContainerSectionContent>
          <BudgetItemsList items={budgetItems} canDownloadInvoice={isAdmin || isRoot} isInverted />
          <Link route="transactions" params={{ collectiveSlug: collective.slug }}>
            <StyledButton mt={3} width="100%" buttonSize="small" fontSize="Paragraph">
              <FormattedMessage id="transactions.viewAll" defaultMessage="View All Transactions" /> →
            </StyledButton>
          </Link>
        </ContainerSectionContent>
      </Box>
    );
  }
}

const transactionsSectionQuery = gql`
  query TransactionsSection($id: Int!, $nbDisplayed: Int!) {
    contributions: allTransactions(CollectiveId: $id, includeExpenseTransactions: false, limit: $nbDisplayed) {
      ...BudgetItemExpenseFragment
      ...BudgetItemOrderFragment
    }
    expenses(FromCollectiveId: $id, limit: $nbDisplayed) {
      entries: expenses {
        ...BudgetItemExpenseTypeFragment
      }
    }
  }
  ${budgetItemExpenseFragment}
  ${budgetItemOrderFragment}
  ${budgetItemExpenseTypeFragment}
`;

const addTransactionsSectionData = graphql(transactionsSectionQuery, {
  options: props => ({
    variables: { id: props.collective.id, nbDisplayed: NB_DISPLAYED },
  }),
});

export default React.memo(injectIntl(addTransactionsSectionData(SectionTransactions)));
