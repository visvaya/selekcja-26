# Not built. The browser jobs in CI run in this image (read by .github/workflows/playwright-image.yml),
# and Dependabot updates the tag and digest together with @playwright/test (.github/dependabot.yml).
# The tag must match the @playwright/test version in pnpm-lock.yaml; scripts/playwright-image.test.mjs checks it.
FROM mcr.microsoft.com/playwright:v1.65.1-noble@sha256:1507cbfc550a63a6b7396791ca4f00df17beb56342d2447b3f106c306f525579
