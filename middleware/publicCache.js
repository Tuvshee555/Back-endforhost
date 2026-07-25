/**
 * Adds Cache-Control to public, read-only endpoints (menu, categories, reviews)
 * so browsers / CDNs can serve repeat requests without hitting the API+DB.
 *
 * Only use on data that is safe to be briefly stale and is NOT user-specific.
 *
 * @param {number} maxAge seconds a client may use the cached response
 * @param {number} swr    seconds it may keep serving stale while revalidating
 */
export const publicCache =
  (maxAge = 15, swr = 30) =>
  (req, res, next) => {
    res.set(
      "Cache-Control",
      `public, max-age=${maxAge}, stale-while-revalidate=${swr}`
    );
    next();
  };
