# AdSense operations

BrokenRepo uses AdSense Auto Ads on public content pages only. Consent messaging is managed in AdSense; the application must not add a second consent prompt.

The application loads AdSense on:

- `/`
- `/challenges` and `/challenges/*`
- `/incidents` and `/incidents/*`

Keep these URL exclusions enabled in **AdSense → Ads → By site → brokenrepo.tech → Page exclusions** as a defense in depth:

- `brokenrepo.tech/lab/*`
- `brokenrepo.tech/login`
- `brokenrepo.tech/signup`
- `brokenrepo.tech/progress`
- `brokenrepo.tech/contact`
- `brokenrepo.tech/admin`

The publisher ID and `ads.txt` entry are public identifiers, not secrets. Do not put API keys or private account credentials in frontend code.
