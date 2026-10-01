# Not built. The browser jobs in CI run in this image (read by .github/workflows/playwright-image.yml),
# and Dependabot updates the tag and digest together with @playwright/test (.github/dependabot.yml).
# The tag must match the @playwright/test version in pnpm-lock.yaml; scripts/playwright-image.test.mjs checks it.
FROM mcr.microsoft.com/playwright:v1.63.0-noble@sha256:eff16c30e6f3f4af0a03fa4b706120d5e9b0891c344a27d64559aff5900a4a27
