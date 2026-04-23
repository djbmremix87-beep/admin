export const cacheData = (key: string, data: any) => {
  localStorage.setItem(key, JSON.stringify({
    data,
    timestamp: Date.now()
  }));
};

export const getCachedData = (key: string, ttlMs = 1000 * 60 * 60) => { // Default 1 hour TTL
  const cached = localStorage.getItem(key);
  if (!cached) return null;
  const { data, timestamp } = JSON.parse(cached);
  if (Date.now() - timestamp > ttlMs) {
    localStorage.removeItem(key);
    return null;
  }
  return data;
};
