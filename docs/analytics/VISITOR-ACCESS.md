# Visitor analytics connection

The public dashboard reader returns aggregate site-scoped metrics only. Users (GA4 totalUsers), sessions, pageviews and search clicks are separate; missing access/data is null, not zero. All registry sites are supported, Mining first. This covers rollout sites without guessing the changing eighteen-site membership.

Observed setup blockers: connected GSC Wizard account has no Google Analytics scope; Mining's existing Vercel project returned404 Web Analytics not found on both aggregate and count reads. Initial public homepage HTML did not contain a GA4 or Vercel Analytics tag. These observations do not establish zero visitors or absence of a separate historical GA4 property.

Owner action: in https://tool.gscwizard.com connect Google Analytics under the existing GSC Wizard account with an account that can read Mining's GA4 property, then link the exact Mining site/property. If analytics was connected under another Wizard account, reconnect the MCP as that account instead. This enables actual connector counts to be read; it does not automatically provision server credentials.

For the dashboard's independent runtime reader, use existing approved server-only MARKETT_GA4_PROPERTY_MAP (domain-to-property numeric ID JSON) and MARKETT_GA4_READ_ACCESS_TOKEN with analytics.readonly access. Never paste tokens in chat or commit them. The hostName filter is mandatory even for a shared GA4 property. No credential, new OAuth application, billing change or tracker is created by this patch. Token refresh/durable consent must be connected through the owning approved runtime integration; an expiring token alone is not unattended access.

Default window: last seven complete Pacific calendar days. GA4 report calendar semantics follow its property timezone, shown separately. Recent GA4 data can still process. Vercel pageviews are not substituted for people or GA4 users.
