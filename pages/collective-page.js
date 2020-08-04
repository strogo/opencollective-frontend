import React from 'react';
import PropTypes from 'prop-types';
import { graphql } from '@apollo/client/react/hoc';
import { get } from 'lodash';
import dynamic from 'next/dynamic';
import { createGlobalStyle } from 'styled-components';

import { generateNotFoundError } from '../lib/errors';

import CollectivePageContent from '../components/collective-page';
import CollectiveNotificationBar from '../components/collective-page/CollectiveNotificationBar';
import { collectivePageQuery } from '../components/collective-page/graphql/queries';
import CollectiveThemeProvider from '../components/CollectiveThemeProvider';
import Container from '../components/Container';
import { MAX_CONTRIBUTORS_PER_CONTRIBUTE_CARD } from '../components/contribute-cards/Contribute';
import ErrorPage from '../components/ErrorPage';
import Loading from '../components/Loading';
import OnboardingModal from '../components/onboarding-modal/OnboardingModal';
import Page from '../components/Page';
import { withUser } from '../components/UserProvider';

/** A page rendered when collective is pledged and not active yet */
const PledgedCollectivePage = dynamic(
  () => import(/* webpackChunkName: 'PledgedCollectivePage' */ '../components/PledgedCollectivePage'),
  { loading: Loading },
);

/** A page rendered when collective is incognito */
const IncognitoUserCollective = dynamic(
  () => import(/* webpackChunkName: 'IncognitoUserCollective' */ '../components/IncognitoUserCollective'),
  { loading: Loading },
);

/** Add global style to enable smooth scroll on the page */
const GlobalStyles = createGlobalStyle`
  html {
    scroll-behavior: ${prop => prop.smooth && 'smooth'};
  }
  section {
    margin: 0;
  }
`;

/**
 * The main page to display collectives. Wrap route parameters and GraphQL query
 * to render `components/collective-page` with everything needed.
 */
class CollectivePage extends React.Component {
  static getInitialProps({ req, res, query: { slug, status, step, mode } }) {
    if (res && req && (req.language || req.locale === 'en')) {
      res.set('Cache-Control', 'public, s-maxage=300');
    }

    return { slug, status, step, mode };
  }

  static propTypes = {
    slug: PropTypes.string.isRequired, // from getInitialProps
    /** A special status to show the notification bar (collective created, archived...etc) */
    status: PropTypes.oneOf([
      'collectiveCreated',
      'collectiveArchived',
      'fundCreated',
      'projectCreated',
      'eventCreated',
    ]),
    step: PropTypes.string,
    mode: PropTypes.string,
    LoggedInUser: PropTypes.object, // from withUser
    data: PropTypes.shape({
      loading: PropTypes.bool,
      error: PropTypes.any,
      Collective: PropTypes.shape({
        name: PropTypes.string,
        type: PropTypes.string.isRequired,
        description: PropTypes.string,
        twitterHandle: PropTypes.string,
        image: PropTypes.string,
        isApproved: PropTypes.bool,
        isArchived: PropTypes.bool,
        isHost: PropTypes.bool,
        isActive: PropTypes.bool,
        isPledged: PropTypes.bool,
        isIncognito: PropTypes.bool,
        parentCollective: PropTypes.shape({ slug: PropTypes.string, image: PropTypes.string }),
        host: PropTypes.object,
        stats: PropTypes.object,
        coreContributors: PropTypes.arrayOf(PropTypes.object),
        financialContributors: PropTypes.arrayOf(PropTypes.object),
        tiers: PropTypes.arrayOf(PropTypes.object),
        events: PropTypes.arrayOf(PropTypes.object),
        connectedCollectives: PropTypes.arrayOf(PropTypes.object),
        transactions: PropTypes.arrayOf(PropTypes.object),
        expenses: PropTypes.arrayOf(PropTypes.object),
        updates: PropTypes.arrayOf(PropTypes.object),
      }),
      refetch: PropTypes.func,
    }).isRequired, // from withData
  };

  constructor(props) {
    super(props);
    this.state = {
      smooth: false,
      showOnboardingModal: true,
    };
  }

  componentDidMount() {
    this.setState({ smooth: true });
  }

  getPageMetaData(collective) {
    if (collective) {
      return {
        title: collective.name,
        description: collective.description,
        twitterHandle: collective.twitterHandle || get(collective, 'parentCollective.twitterHandle'),
        image: collective.image || get(collective, 'parentCollective.image'),
      };
    } else {
      return {
        title: 'Collective',
        image: '/static/images/defaultBackgroundImage.png',
      };
    }
  }

  setShowOnboardingModal = bool => {
    this.setState({ showOnboardingModal: bool });
  };

  render() {
    const { slug, data, LoggedInUser, status, step, mode } = this.props;
    const { showOnboardingModal } = this.state;

    const loading = data.loading && !data.Collective;

    if (!loading) {
      if (!data || data.error) {
        return <ErrorPage data={data} />;
      } else if (!data.Collective) {
        return <ErrorPage error={generateNotFoundError(slug)} log={false} />;
      } else if (data.Collective.isPledged && !data.Collective.isActive) {
        return <PledgedCollectivePage collective={data.Collective} />;
      } else if (data.Collective.isIncognito) {
        return <IncognitoUserCollective collective={data.Collective} />;
      }
    }

    const collective = data && data.Collective;

    return (
      <Page {...this.getPageMetaData(collective)} withoutGlobalStyles>
        <GlobalStyles smooth={this.state.smooth} />
        {loading ? (
          <Container py={[5, 6]}>
            <Loading />
          </Container>
        ) : (
          <React.Fragment>
            <CollectiveNotificationBar
              collective={collective}
              host={collective.host}
              status={status}
              LoggedInUser={LoggedInUser}
            />
            <CollectiveThemeProvider collective={collective}>
              {({ onPrimaryColorChange }) => (
                <CollectivePageContent
                  collective={collective}
                  host={collective.host}
                  coreContributors={collective.coreContributors}
                  financialContributors={collective.financialContributors}
                  tiers={collective.tiers}
                  events={collective.events}
                  projects={collective.projects}
                  connectedCollectives={collective.connectedCollectives}
                  transactions={collective.transactions}
                  expenses={collective.expenses}
                  stats={collective.stats}
                  updates={collective.updates}
                  conversations={collective.conversations}
                  LoggedInUser={LoggedInUser}
                  isAdmin={Boolean(LoggedInUser && LoggedInUser.canEditCollective(collective))}
                  isHostAdmin={Boolean(LoggedInUser && LoggedInUser.canEditCollective(collective.host))}
                  isRoot={Boolean(LoggedInUser && LoggedInUser.isRoot())}
                  onPrimaryColorChange={onPrimaryColorChange}
                  step={step}
                  mode={mode}
                  refetch={data.refetch}
                />
              )}
            </CollectiveThemeProvider>
            {LoggedInUser && mode === 'onboarding' && (
              <OnboardingModal
                showOnboardingModal={showOnboardingModal}
                setShowOnboardingModal={this.setShowOnboardingModal}
                step={step}
                mode={mode}
                collective={collective}
                LoggedInUser={LoggedInUser}
              />
            )}
          </React.Fragment>
        )}
      </Page>
    );
  }
}

export const getCollectivePageQueryVariables = collectiveSlug => {
  return {
    slug: collectiveSlug,
    nbContributorsPerContributeCard: MAX_CONTRIBUTORS_PER_CONTRIBUTE_CARD,
  };
};

const addCollectivePageData = graphql(collectivePageQuery, {
  options: props => ({
    variables: getCollectivePageQueryVariables(props.slug),
  }),
});

export default withUser(addCollectivePageData(CollectivePage));
