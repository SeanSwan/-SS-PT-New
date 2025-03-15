import { Link as RouterLink } from 'react-router-dom';

// material-ui
import Link from '@mui/material/Link';

// project imports
import Logo from '../../../assets/Logo.png';

// Dashboard path constant
const DASHBOARD_PATH = '/dashboard'; // Adjust this path based on your routing setup

/**
 * LogoSection Component
 * Displays the application logo with a link to the dashboard
 */
const LogoSection = () => {
  return (
    <Link component={RouterLink} to={DASHBOARD_PATH} aria-label="theme-logo">
      <Logo />
    </Link>
  );
};

export default LogoSection;