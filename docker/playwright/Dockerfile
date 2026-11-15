# Not built. The browser jobs in CI run in this image (read by .github/workflows/playwright-image.yml),
# and Dependabot updates the tag and digest together with @playwright/test (.github/dependabot.yml).
# The tag must match the @playwright/test version in pnpm-lock.yaml; scripts/playwright-image.test.mjs checks it.
FROM mcr.microsoft.com/playwright:v1.65.0-noble@sha256:9beb546099e11f52d62e505537914870e01a67e0e6b00ae41da4775324e73dbe
