# Final production pass

The app already builds clean, passes typecheck/lint, and the security and dependency scans came back clear. What remains is release hygiene: canonical URLs, crawler files, template leftovers in the site metadata, and one last verification run before publishing.

## 1. Point the site at the real domain

The project is served on a custom domain (`marginmap.assistant.bd`), but every canonical tag and `og:url` still points at the `pixel-perfect-render-330.lovable.app` address. Search engines would treat the Lovable URL as the real one.

- Set a single site-URL constant to the custom domain and use it for all canonical tags, `og:url`, and JSON-LD.
- Fix the homepage route, which hardcodes the old URL instead of using the shared helper.

## 2. Clean the template leftovers from site metadata

- Remove the `author: Lovable` and `twitter:site: @Lovable` tags and replace them with MarginMap values.
- Move the social preview image off the root route so each page can carry its own, and drop the generic uploaded placeholder in favour of a MarginMap-branded preview image generated from the new brand mark.

## 3. Crawler and indexing files

- Add `public/sitemap.xml` listing the homepage, eight pillar pages, and the company/legal pages.
- Add a `Sitemap:` line to `robots.txt`, and disallow the private surfaces (`/app`, `/auth`) so the workspace is not indexed.
- Add Organization JSON-LD (name, logo, legal entity, address) on the homepage.

## 4. Per-page metadata sweep

Confirm each marketing route has a unique title, description, and canonical, and that the private routes (`/app/*`) are marked `noindex`.

## 5. Final verification before publish

- Typecheck, lint, format check, and a production build.
- Browser smoke test on a production build: every public route returns 200 with no console errors, plus one signed-in pass through search → variant → evaluate → watchlist to confirm the saved-data flows still write.
- Fresh security scan, then publish.

## Technical notes

- `src/lib/seo.ts` holds `SITE_URL` and `pageHead`; `_marketing.index.tsx` bypasses it with inline literals and needs to be switched over.
- `og:image` / `twitter:image` currently live in `src/routes/__root.tsx`; they belong in leaf route heads with an absolute HTTPS URL.
- The new preview image will be generated into `src/assets/` and copied to `public/` so it is reachable at a stable absolute URL.
- No database, RLS, or business-logic changes are part of this pass.
