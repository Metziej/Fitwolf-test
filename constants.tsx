
// Fix line 2: Module '"./types"' has no exported member 'Exercise'.
import { Exercise, MealBlueprint, MindsetStep } from './types.ts';

export const BASE_KCAL = 2672;

export const WORKOUT_CYCLE = [
  {
    id: "0",
    title: "PUSH (CHEST & TRICEPS)",
    exercises: [
      { id: "p1", name: "Cable Chest Fly (Low to High)", reps: "6-8 reps (TO FAILURE)", videoUrl: "https://www.youtube.com/embed/SrqOu55lr6A" },
      { id: "p2", name: "Cable Chest Fly (Straight)", reps: "6-8 reps (TO FAILURE)", videoUrl: "https://www.youtube.com/embed/eGjt4lk6g34" },
      { id: "p3", name: "Cable Chest Fly (High to Low)", reps: "6-8 reps (TO FAILURE)", videoUrl: "https://www.youtube.com/embed/SrqOu55lr6A" },
      { id: "p4", name: "Weighted Dips", reps: "6-8 reps (TO FAILURE)", videoUrl: "https://www.youtube.com/embed/4SOnD5C-2rM" },
      { id: "p5", name: "Tricep Cable Bar Pushdown", reps: "6-8 reps (TO FAILURE)", videoUrl: "https://www.youtube.com/embed/2-LAMcpzHLU" },
      { id: "p6", name: "Overhead Tricep Extension", reps: "6-8 reps (TO FAILURE)", videoUrl: "https://www.youtube.com/embed/6_CSKJyeZas" },
      { id: "p7", name: "Shoulder Press (Dumbbells)", reps: "6-8 reps (TO FAILURE)", videoUrl: "https://www.youtube.com/embed/qEwKCR5JCog" },
      { id: "p8", name: "Core: Weighted Plank", reps: "3 sets TO FAILURE", videoUrl: "https://www.youtube.com/embed/pSHjTRCQxIw" }
    ]
  },
  {
    id: "1",
    title: "PULL (BACK & BICEPS)",
    exercises: [
      { id: "pl1", name: "Deadlift (Use Belt!)", reps: "6-8 reps (TO FAILURE)", videoUrl: "https://www.youtube.com/embed/op9kVnSso6Q" },
      { id: "pl2", name: "Straight Bar Row (or T-Bar)", reps: "6-8 reps (TO FAILURE)", videoUrl: "https://www.youtube.com/embed/I0TAtnL0pIs" },
      { id: "pl3", name: "Dumbbell Bicep Curls", reps: "6-8 reps (TO FAILURE)", videoUrl: "https://www.youtube.com/embed/ykJgr1bh340" },
      { id: "pl4", name: "Hammer Curls", reps: "6-8 reps (TO FAILURE)", videoUrl: "https://www.youtube.com/embed/twW2JK29Gww" },
      { id: "pl5", name: "Face Pulls", reps: "6-8 reps (TO FAILURE)", videoUrl: "https://www.youtube.com/embed/V8dZ3pyiCBo" },
      { id: "pl6", name: "Lateral Raises", reps: "6-8 reps (TO FAILURE)", videoUrl: "https://www.youtube.com/embed/WJm9JmXf00o" },
      { id: "pl7", name: "Front Raises", reps: "6-8 reps (TO FAILURE)", videoUrl: "https://www.youtube.com/embed/hRJ6EBp6D2k" },
      { id: "pl8", name: "Core: Weighted Russian Twists", reps: "26-30 reps (TO FAILURE)", videoUrl: "https://www.youtube.com/embed/wkD8rjkodUI" }
    ]
  },
  {
    id: "2",
    title: "LEGS & SHOULDERS",
    exercises: [
      { id: "l1", name: "Squats", reps: "6-8 reps (TO FAILURE)", videoUrl: "https://www.youtube.com/embed/SW_C1A-rejs" },
      { id: "l2", name: "Hip Thrusts", reps: "6-8 reps (TO FAILURE)", videoUrl: "https://www.youtube.com/embed/SEdqBc_utxc" },
      { id: "l3", name: "Leg Extension", reps: "6-8 reps (TO FAILURE)", videoUrl: "https://www.youtube.com/embed/m0O_nLBeXWc" },
      { id: "l4", name: "Leg Curl", reps: "6-8 reps (TO FAILURE)", videoUrl: "https://www.youtube.com/embed/ELOCsoSyz8w" },
      { id: "l5", name: "Seated Abduction", reps: "6-8 reps (TO FAILURE)", videoUrl: "https://www.youtube.com/embed/0G2_Xd7pY_E" },
      { id: "l6", name: "Seated Adduction", reps: "6-8 reps (TO FAILURE)", videoUrl: "https://www.youtube.com/embed/7Vp20r17q3Q" },
      { id: "l7", name: "Core: Crunch Machine", reps: "25-30 reps (TO FAILURE)", videoUrl: "https://www.youtube.com/embed/Xm_6z0aGf0U" }
    ]
  }
];

export const DEFAULT_MINDSET: MindsetStep[] = [
  { id: 1, title: "PHASE I: DECOMPRESS", desc: "Foundation frequency: 174Hz. Silence all external variables.", duration: 60, frequency: 174 },
  { id: 2, title: "PHASE II: TARGET ACQUISITION", desc: "Transformation frequency: 528Hz. Lock onto your objective.", duration: 60, frequency: 528 },
  { id: 3, title: "PHASE III: FINAL ASCENSION", desc: "Awakened frequency: 963Hz. Absolute system integration.", duration: 60, frequency: 963 }
];

export const NUTRITION_BLUEPRINT: MealBlueprint[] = [
  { 
    id: "m1", 
    name: "BREAKFAST: GREEK RECOVERY", 
    items: [
      { name: "Full Fat Greek Yogurt", base: 200, unit: "g" },
      { name: "Granola/Cruesli", base: 30, unit: "g" },
      { name: "Blueberries", base: 50, unit: "g" },
      { name: "Honey", base: 10, unit: "g" },
      { name: "Boiled Eggs", base: 2, unit: "pcs" }
    ],
    p: 24, c: 50, f: 22, kcal: 525,
    preparation: "Combine yogurt, granola, blueberries and honey in a bowl. Boil eggs for 7 mins (soft) or 9 mins (hard)."
  },
  { 
    id: "m2", 
    name: "SNACK I: POWER BREAD", 
    items: [
      { name: "Whole Wheat Bread", base: 2, unit: "slices" },
      { name: "Peanut Butter", base: 30, unit: "g" },
      { name: "Banana", base: 1, unit: "pcs" }
    ],
    p: 22, c: 88, f: 20, kcal: 590,
    preparation: "Toast bread slightly. Spread peanut butter. Slice banana on top." 
  },
  { 
    id: "m3", 
    name: "LUNCH: PREDATOR WRAP", 
    items: [
      { name: "Whole Wheat Wrap", base: 1, unit: "pcs" },
      { name: "Chicken Breast (Cold Cut)", base: 75, unit: "g" },
      { name: "Avocado", base: 15, unit: "g" },
      { name: "Feta", base: 30, unit: "g" },
      { name: "Bell Pepper", base: 30, unit: "g" },
      { name: "Broccoli (Side)", base: 30, unit: "g" }
    ],
    p: 35, c: 38, f: 15, kcal: 430,
    preparation: "Lay out wrap. Add chicken, mashed avocado, crumbled feta and sliced peppers. Roll tight. Steam broccoli as side."
  },
  { 
    id: "m4", 
    name: "POST-WORKOUT: WOLF FUEL", 
    items: [
      { name: "Whole Milk", base: 250, unit: "ml" },
      { name: "Whey Protein", base: 30, unit: "g" },
      { name: "Snickers (Reward)", base: 1, unit: "pcs" }
    ],
    p: 34, c: 40, f: 16, kcal: 450,
    preparation: "Mix whey and milk in shaker. Consume immediately after training. Eat Snickers as quick carb reload."
  },
  { 
    id: "m5", 
    name: "DINNER: MAIN BATTLE MEAL", 
    items: [
      { name: "Chicken Breast / Ground Beef", base: 150, unit: "g" },
      { name: "Whole Wheat Rice / Pasta", base: 75, unit: "g" },
      { name: "Mixed Vegetables", base: 150, unit: "g" },
      { name: "Olive Oil", base: 5, unit: "g" }
    ],
    p: 40, c: 50, f: 10, kcal: 500,
    preparation: "Cook carb source. Pan fry meat in olive oil. Steam or stir-fry vegetables. Combine and season."
  },
  { 
    id: "m6", 
    name: "NIGHT SNACK: OVERNIGHT REPAIR", 
    items: [
      { name: "Low Fat Quark / Cottage Cheese", base: 400, unit: "g" },
      { name: "Mixed Nuts", base: 20, unit: "g" },
      { name: "Dark Chocolate", base: 10, unit: "g" }
    ],
    p: 35, c: 21, f: 19, kcal: 400,
    preparation: "Mix quark with nuts. Eat chocolate separately or crush on top."
  }
];
