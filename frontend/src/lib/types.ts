export type Role = 'DONOR' | 'VOLUNTEER' | 'NGO';
export type Diet = 'VEG' | 'NON_VEG';
export type Category = 'COOKED' | 'BAKERY' | 'FRUIT_VEG' | 'PACKAGED' | 'RAW';
export type Unit = 'SERVINGS' | 'KG' | 'PACKS';
export type Status = 'AVAILABLE' | 'ACCEPTED' | 'CLAIMED' | 'PICKED_UP' | 'DELIVERED' | 'EXPIRED' | 'CANCELLED';
export type SafetyCheck = 'COVERED' | 'SAFE_TEMP' | 'NO_RETURNS' | 'ALLERGENS_NOTED';
export type Urgency = 'CRITICAL' | 'SOON' | 'FRESH' | 'EXPIRED';

export interface NgoRef {
  id: number;
  name: string;
  address: string;
  lat: number;
  lng: number;
  acceptingFood: boolean;
}

export interface User {
  id: number;
  role: Role;
  name: string;
  phone: string;
  initials: string;
  orgType?: string;
  vehicle?: string;
  address: string;
  lat: number;
  lng: number;
  verified: boolean;
  onDuty: boolean;
  acceptingFood: boolean;
  dropNgo?: NgoRef;
  rating: number;
  rescues: number;
}

export interface PersonRef {
  id: number;
  name: string;
  initials: string;
  phone: string;
  vehicle?: string;
  orgType?: string;
  rating?: number;
  rescues?: number;
}

export interface GeoPoint {
  lat: number;
  lng: number;
  at: string;
}

export interface Donation {
  id: number;
  code: string;
  title: string;
  diet: Diet;
  category: Category;
  quantity: number;
  unit: Unit;
  weightKg: number;
  containers?: number;
  photoUrl?: string;
  note?: string;
  address: string;
  lat: number;
  lng: number;
  preparedAt?: string;
  bestBefore: string;
  pickupFrom: string;
  pickupUntil: string;
  safetyChecks: SafetyCheck[];
  status: Status;
  donor: PersonRef;
  volunteer?: PersonRef;
  ngo?: NgoRef;
  claimedAt?: string;
  pickedUpAt?: string;
  deliveredAt?: string;
  createdAt: string;
  distanceKm?: number;
  meals: number;
  pickupCode?: string;
  dropCode?: string;
  lastLocation?: GeoPoint;
}

export interface CreateDonation {
  title: string;
  diet: Diet;
  category: Category;
  quantity: number;
  unit: Unit;
  weightKg?: number;
  containers?: number;
  photoUrl?: string;
  note?: string;
  address: string;
  lat: number;
  lng: number;
  preparedAt?: string;
  bestBefore: string;
  pickupFrom: string;
  pickupUntil: string;
  safetyChecks: SafetyCheck[];
}

export interface PublicStats {
  mealsRescued: number;
  foodKg: number;
  co2Kg: number;
  activeVolunteers: number;
  partnerNgos: number;
  livePickups: number;
  medianPickupMinutes: number;
  deliveredBeforeExpiryPct: number;
}

export interface MyStats {
  monthLabel: string;
  pickups: number;
  meals: number;
  rank?: number;
  donations?: number;
  live?: number;
  nextBadge?: { name: string; current: number; target: number };
}

export interface DashboardStats {
  days: number;
  mealsRescued: number;
  mealsDeltaPct: number;
  foodKg: number;
  foodDeltaKg: number;
  medianPickupMinutes: number;
  medianDeltaMinutes: number;
  deliveredBeforeExpiryPct: number;
  perDay: { date: string; meals: number }[];
  funnel: { posted: number; claimed: number; pickedUp: number; delivered: number; expired: number };
  categories: { category: Category; pct: number }[];
  topVolunteers: { id: number; name: string; initials: string; pickups: number; meals: number }[];
  co2Kg: number;
}

export interface Activity {
  id: number;
  type: 'POSTED' | 'ACCEPTED' | 'CLAIMED' | 'PICKED_UP' | 'DELIVERED' | 'EXPIRED' | 'RELEASED';
  actorName: string;
  actorInitials: string;
  donationId: number;
  donationTitle: string;
  quantityLabel: string;
  donorName: string;
  ngoName?: string;
  at: string;
}

export interface LocationEvent {
  donationId: number;
  lat: number;
  lng: number;
  at: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}
