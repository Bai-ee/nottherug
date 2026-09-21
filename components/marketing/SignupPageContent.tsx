import SiteNav from '@/components/SiteNav';
import SiteFooter from './SiteFooter';
import ContactSheetSection from './ContactSheetSection';

/**
 * /signup: the home page's questionnaire band on its own — same nav, same
 * green closing band (#home-closing-band-shell), same footer — for a link
 * that lands straight on the form.
 */
export default function SignupPageContent() {
  return (
    <div id="signup-page-shell">
      <SiteNav />
      {/* The band clears the fixed nav on its own here; on the home page the
          sections above it do that. */}
      <div id="home-closing-band-shell" style={{ paddingTop: 'var(--nav-h)' }}>
        <ContactSheetSection source="signup" paneId="signup-meetgreet" headingLevel="h1" />
        <SiteFooter />
      </div>
    </div>
  );
}
