/**
 * Shared utility functions
 */

// ============================================================================
// DATE & TIME
// ============================================================================

export function formatDate(date: Date | string, format: string = 'YYYY-MM-DD'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const map: Record<string, string> = {
    YYYY: d.getFullYear().toString(),
    MM: (d.getMonth() + 1).toString().padStart(2, '0'),
    DD: d.getDate().toString().padStart(2, '0'),
    HH: d.getHours().toString().padStart(2, '0'),
    mm: d.getMinutes().toString().padStart(2, '0'),
    ss: d.getSeconds().toString().padStart(2, '0'),
  };
  return format.replace(/YYYY|MM|DD|HH|mm|ss/g, (matched) => map[matched]);
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function addHours(date: Date, hours: number): Date {
  const result = new Date(date);
  result.setHours(result.getHours() + hours);
  return result;
}

export function differenceInHours(date1: Date, date2: Date): number {
  return Math.abs(date2.getTime() - date1.getTime()) / (1000 * 60 * 60);
}

export function differenceInDays(date1: Date, date2: Date): number {
  return Math.abs(date2.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24);
}

// ============================================================================
// GEOGRAPHIC CALCULATIONS
// ============================================================================

export function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

export function calculateETA(
  currentLocation: { latitude: number; longitude: number },
  destination: { latitude: number; longitude: number },
  averageSpeedKmh: number = 80
): Date {
  const distance = haversineDistance(
    currentLocation.latitude, currentLocation.longitude,
    destination.latitude, destination.longitude
  );
  const hours = distance / averageSpeedKmh;
  return addHours(new Date(), hours);
}

export function isWithinRadius(
  center: { latitude: number; longitude: number },
  point: { latitude: number; longitude: number },
  radiusKm: number
): boolean {
  return haversineDistance(center.latitude, center.longitude, point.latitude, point.longitude) <= radiusKm;
}

// ============================================================================
// MONEY & CURRENCY
// ============================================================================

export function formatCurrency(amount: number, currency: string = 'USD', locale: string = 'en-US'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function calculatePlatformFee(amount: number, percentage: number = 2.5): number {
  return roundToDecimals(amount * (percentage / 100), 2);
}

export function calculateProcessingFee(amount: number, fixedFee: number = 0.30, percentage: number = 2.9): number {
  return roundToDecimals(amount * (percentage / 100) + fixedFee, 2);
}

export function roundToDecimals(value: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

// ============================================================================
// STRING UTILITIES
// ============================================================================

export function generateId(prefix?: string): string {
  const uuid = crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  return prefix ? `${prefix}_${uuid}` : uuid;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function truncate(text: string, length: number = 100, suffix: string = '...'): string {
  if (text.length <= length) return text;
  return text.substring(0, length - suffix.length) + suffix;
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

export function camelToSnake(text: string): string {
  return text.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

export function snakeToCamel(text: string): string {
  return text.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

export function isValidEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

export function isValidPhone(phone: string): boolean {
  const re = /^\+?[\d\s\-\(\)]{10,}$/;
  return re.test(phone);
}

export function isValidVIN(vin: string): boolean {
  return /^[A-HJ-NPR-Z0-9]{17}$/i.test(vin);
}

export function isValidLicensePlate(plate: string): boolean {
  return plate.length >= 1 && plate.length <= 20;
}

// ============================================================================
// ARRAY & OBJECT UTILITIES
// ============================================================================

export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

export function groupBy<T, K extends keyof any>(array: T[], key: (item: T) => K): Record<K, T[]> {
  return array.reduce((result, item) => {
    const groupKey = key(item);
    if (!result[groupKey]) result[groupKey] = [];
    result[groupKey].push(item);
    return result;
  }, {} as Record<K, T[]>);
}

export function sortBy<T>(array: T[], key: keyof T, order: 'asc' | 'desc' = 'asc'): T[] {
  return [...array].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];
    if (aVal < bVal) return order === 'asc' ? -1 : 1;
    if (aVal > bVal) return order === 'asc' ? 1 : -1;
    return 0;
  });
}

export function unique<T>(array: T[]): T[] {
  return [...new Set(array)];
}

export function uniqueBy<T, K>(array: T[], key: (item: T) => K): T[] {
  const seen = new Set<K>();
  return array.filter((item) => {
    const k = key(item);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

// ============================================================================
// ASYNC UTILITIES
// ============================================================================

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function retry<T>(
  fn: () => Promise<T>,
  attempts: number = 3,
  delayMs: number = 1000
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (attempts <= 1) throw error;
    await delay(delayMs);
    return retry(fn, attempts - 1, delayMs * 2);
  }
}

export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), wait);
  };
}

export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// ============================================================================
// SECURITY UTILITIES
// ============================================================================

export function sanitizeString(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local.substring(0, 2)}${'*'.repeat(local.length - 2)}@${domain}`;
}

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return phone;
  return `${'*'.repeat(digits.length - 4)}${digits.slice(-4)}`;
}

// ============================================================================
// RATING & STATISTICS
// ============================================================================

export function calculateAverageRating(ratings: number[]): number {
  if (ratings.length === 0) return 0;
  const sum = ratings.reduce((a, b) => a + b, 0);
  return roundToDecimals(sum / ratings.length, 1);
}

export function calculatePercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

// ============================================================================
// LOAD CALCULATIONS
// ============================================================================

export function calculateLoadRatePerMile(
  totalRate: number,
  distanceMiles: number
): number {
  if (distanceMiles <= 0) return 0;
  return roundToDecimals(totalRate / distanceMiles, 2);
}

export function estimateFuelCost(
  distanceKm: number,
  fuelEfficiencyLPer100km: number,
  fuelPricePerLiter: number
): number {
  const liters = (distanceKm / 100) * fuelEfficiencyLPer100km;
  return roundToDecimals(liters * fuelPricePerLiter, 2);
}

export function calculateDriverPay(
  distanceKm: number,
  ratePerMile: number,
  currency: 'USD' | 'CAD' | 'EUR' = 'USD'
): number {
  const miles = kmToMiles(distanceKm);
  return roundToDecimals(miles * ratePerMile, 2);
}

export function kmToMiles(km: number): number {
  return roundToDecimals(km * 0.621371, 2);
}

export function milesToKm(miles: number): number {
  return roundToDecimals(miles * 1.60934, 2);
}

export function kgToLbs(kg: number): number {
  return roundToDecimals(kg * 2.20462, 2);
}

export function lbsToKg(lbs: number): number {
  return roundToDecimals(lbs * 0.453592, 2);
}

// ============================================================================
// PAGINATION
// ============================================================================

export function paginate<T>(
  array: T[],
  page: number,
  limit: number
): { items: T[]; total: number; page: number; limit: number; hasMore: boolean } {
  const total = array.length;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const items = array.slice(startIndex, endIndex);
  return {
    items,
    total,
    page,
    limit,
    hasMore: endIndex < total,
  };
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function createErrorResponse(error: AppError | Error): {
  success: false;
  error: { code: string; message: string; details?: any };
} {
  if (error instanceof AppError) {
    return {
      success: false,
      error: { code: error.code, message: error.message, details: error.details },
    };
  }
  return {
    success: false,
    error: { code: 'INTERNAL_ERROR', message: error.message },
  };
}
