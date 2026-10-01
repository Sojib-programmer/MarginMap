export const isListingUrl = (q: string): boolean => {
  try {
    const u = new URL(q.trim());
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
};
