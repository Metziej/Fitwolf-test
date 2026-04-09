
export enum Goal {
  CUT = "CUT",
  BULK = "BULK"
}

export enum Sex {
  MALE = "MALE",
  FEMALE = "FEMALE"
}

export enum UnitSystem {
  METRIC = "METRIC",
  IMPERIAL = "IMPERIAL"
}

export enum UserRole {
  HUNTER = "HUNTER",
  ADMIN = "ADMIN"
}

export interface UserStats {
  str: number;
  vit: number;
  int: number;
  recovery: number;
}

export interface AccessTier {
  id: string;
  name: string;
  price: number;
  perks: string[];
  color: string;
}

export interface Exercise {
  id: string;
  name: string;
  reps: string;
  videoUrl?: string;
  weight?: number;
  repsFilled?: number;
  completed?: boolean;
  isCustom?: boolean;
}

export interface WorkoutSession {
  id: string; 
  workoutId?: string;
  title: string;
  exercises: Exercise[];
  date?: string; 
  xpEarned?: number;
  unitSystem?: UnitSystem;
}

export interface BattleLogEntry {
  id: string;
  type: 'STR' | 'VIT' | 'INT';
  title: string;
  date: string;
  xpEarned: number;
  details: any;
}

export interface Ingredient {
    name: string;
    base: number;
    unit: string;
}

export interface MealBlueprint {
    id: string;
    name: string;
    items: Ingredient[];
    p: number;
    c: number;
    f: number;
    kcal: number;
    preparation: string;
}

export type MeasureUnit = 'g' | 'ml' | 'pcs' | 'scoop' | 'bowl' | 'bag';

export interface CustomDish {
  id: string;
  name: string;
  kcal: number;
  p: number;
  c: number;
  f: number;
  amount?: number;
  unit?: MeasureUnit;
  preparation?: string;
}

export interface MindsetStep {
    id: number | string;
    title: string;
    desc: string;
    duration: number;
    frequency: number;
    audioUrl?: string; // New: Support for MP3 files
}

export interface CropConfig {
  x: number;
  y: number;
  scale: number;
  aspectRatio: string;
}

export interface CharacterConfig {
  headSize: number;
  muscleMass: number;
  height: number;
  eyeColor: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  discountLabel?: string;
  category: string;
  image: string;
  buff: string;
}

export interface DiscountCode {
  code: string;
  percentage: number;
}

export type RaidFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ONETIME';

export interface RaidOrder {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  isCompleted: boolean;
  aspectRatio?: '16:9' | '9:16';
  backgroundImage?: string;
  frequency: RaidFrequency;
}

// New Interface for daily persistence
export interface DailyProgress {
    date: string; // "YYYY-MM-DD" to reset on new day
    str: {
        workoutId: string;
        exercises: Exercise[];
    };
    vit: {
        checkedMeals: string[];
        customDishes: CustomDish[];
    };
    int: {
        completedSteps: number[]; // IDs of completed steps
    };
}

export interface GuildComment {
    id: string;
    user: string;
    text: string;
    timestamp: string;
}

export interface WeeklyReport {
    date: string;       // "YYYY-MM-DD" van de zondag
    weight: number;     // kg
    energyLevel: number; // 1–10
    photo?: string;     // base64 optioneel
}

export interface SeasonalEvent {
    id: string;
    title: string;          // bijv. "BEAST MODE WEEK"
    description: string;
    icon: string;           // emoji
    color: string;          // hex
    startDate: string;      // "YYYY-MM-DD"
    endDate: string;        // "YYYY-MM-DD"
    xpMultiplier: number;   // bijv. 2.0 voor dubbele XP
    milestoneGoal?: number; // community doel in totale XP
    milestoneReached?: boolean;
}

export interface Invoice {
    id: string;
    date: string;
    amount: number;
    currency: string;
    status: 'paid' | 'open' | 'void';
    pdfUrl?: string;
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  tierId: string;
  isBanned?: boolean;
  weight: number;
  height: number;
  age: number;
  sex?: Sex;   // Mifflin-St Jeor vereist geslacht voor BMR — default MALE voor bestaande profielen
  goal: Goal;
  units: UnitSystem;
  kcal: number;
  protein: number;
  carbs: number;
  fats: number;
  scaleRatio: number;
  activityLevel: number;
  characterConfig: CharacterConfig;
  customRoutines?: Record<string, string[]>;
  customNutrition?: CustomDish[]; // Keep for "saved favorites" logic if needed, but primary is DailyProgress
  shippingAddress?: string;
  bankAccount?: string;
  bankName?: string;
  paymentMethod?: 'IDEAL' | 'PAYPAL' | 'CARD' | 'SEPA';
  profilePic?: string;
  phone?: string;
  profilePicCrop?: CropConfig;
  language?: string;
  photos?: Record<string, string>;
  checkedItems?: string[];
  activeProgramId?: string;
  stats: UserStats;
  dailyProgress?: DailyProgress; // Nieuw
  xp?: number;
  history?: BattleLogEntry[];
  streak?: number;           // Aantal aaneengesloten actieve dagen
  lastActiveDate?: string;   // ISO date string "YYYY-MM-DD"
  currentDayIndex?: number;  // Welke workout-dag de user op staat (0=Push, 1=Pull, 2=Legs)
  weeklyReports?: WeeklyReport[];
  referralCode?: string;     // Unieke code van deze user
  referredBy?: string;       // Referral code van wie hem uitnodigde
  referralCount?: number;    // Hoeveel mensen hij heeft uitgenodigd
  allies?: string[];         // UIDs van toegevoegde bondgenoten
  subscriptionId?: string;   // Stripe subscription ID (voor managed subscriptions)
  onboardingEmailsSent?: string[]; // Welke dag-flows al verstuurd zijn (bijv. ["day0","day3"])
}

export interface ProgramDay {
  dayNumber: number;
  title: string;
  workoutId: string;
  nutritionId: string;
  mindsetId: string;
  isRestDay: boolean;
}

export interface ProgramWeek {
  weekNumber: number;
  days: ProgramDay[];
}

export interface Program {
  id: string;
  title: string;
  description: string;
  tierId: string;
  weeks: ProgramWeek[];
  isActive: boolean;
}

export interface GlobalSystemData {
  guildBoss: {
    name: string;
    maxHp: number;
    currentHp: number;
    image?: string;
  };
  raidOrders: RaidOrder[];
  shopProducts: Product[];
  discountCodes: DiscountCode[];
  globalWorkouts: WorkoutSession[];
  globalNutrition: MealBlueprint[];
  globalMindset: MindsetStep[];
  programs: Program[];
  accessTiers: AccessTier[];
  dashboardConfig: {
    bgImage: string;
    showCharacter: boolean;
  };
  seasonalEvents?: SeasonalEvent[];
  communityXpTotal?: number;  // Totale XP aller users voor milestones
}

export interface SystemState {
  isLoggedIn: boolean;
  currentUser: UserProfile | null;
  users: UserProfile[];
  xp: number;
  rank: string;
  dailyQuests: { str: boolean; vit: boolean; int: boolean };
  history: BattleLogEntry[];
  activeTab: 'ARMORY' | 'COMMAND' | 'GUILD' | 'ADMIN';
  globalSystemData: GlobalSystemData;
  currentWorkoutIndex: number;
  messages: any[];
}
