import React from 'react';
import PropTypes from 'prop-types';

import { Box } from '../../components/Grid';
import { withUser } from '../../components/UserProvider';

import StepProfileGuestForm from './StepProfileGuestForm';
import StepProfileLoggedInForm from './StepProfileLoggedInForm';

const NewContributionFlowStepProfile = ({
  LoggedInUser,
  collective,
  stepDetails,
  profiles,
  defaultSelectedProfile,
  onChange,
  data,
  canUseIncognito,
}) => {
  return (
    <Box width={1}>
      {LoggedInUser ? (
        <StepProfileLoggedInForm
          profiles={profiles}
          defaultSelectedProfile={defaultSelectedProfile}
          onChange={onChange}
          canUseIncognito={canUseIncognito}
          collective={collective}
        />
      ) : (
        <StepProfileGuestForm stepDetails={stepDetails} data={data} onChange={onChange} />
      )}
    </Box>
  );
};

NewContributionFlowStepProfile.propTypes = {
  LoggedInUser: PropTypes.object,
  collective: PropTypes.object,
  stepDetails: PropTypes.shape({
    amount: PropTypes.number,
    interval: PropTypes.string,
  }),
  data: PropTypes.object,
  onChange: PropTypes.func,
  defaultSelectedProfile: PropTypes.object,
  profiles: PropTypes.array,
  canUseIncognito: PropTypes.bool,
};

export default withUser(NewContributionFlowStepProfile);
