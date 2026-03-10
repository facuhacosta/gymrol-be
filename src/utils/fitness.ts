export type FitnessCategory = "underweight" | "normal_weight" | "overweight_light" | "overweight_moderate" | "obesity_severe";

export interface UserFitnessProfile {
  height: number; // cm
  weight: number; // kg * 10
  age: number;
  gender: "male" | "female";
}

export const calculateBMI = (profile: UserFitnessProfile): number => {
  const heightInMeters = profile.height / 100;
  const weightInKg = profile.weight / 10;
  return Number((weightInKg / (heightInMeters * heightInMeters)).toFixed(1));
};

export const getIdealWeight = (profile: UserFitnessProfile): number => {
  const heightInMeters = profile.height / 100;
  // Using BMI 22.5 as a standard ideal reference for simplicity
  return 22.5 * (heightInMeters * heightInMeters);
};

export const classifyFitness = (profile: UserFitnessProfile): FitnessCategory => {
  const weightInKg = profile.weight / 10;
  const idealWeight = getIdealWeight(profile);
  const excessWeight = weightInKg - idealWeight;
  const bmi = calculateBMI(profile);

  if (bmi < 18.5) return "underweight";
  
  if (excessWeight > 30) return "obesity_severe";
  if (excessWeight > 15) return "overweight_moderate";
  if (excessWeight > 5) return "overweight_light";
  
  return "normal_weight";
};

export interface Exercise {
  id: string;
  name: string;
  impact: "low" | "high";
  tags: string[];
}

export const isExerciseCompatible = (exercise: Exercise, profile: UserFitnessProfile): boolean => {
  const category = classifyFitness(profile);
  const tags = exercise.tags || [];

  // Restrictions for severe obesity
  if (category === "obesity_severe") {
    // Low impact exercises only
    if (exercise.impact === "high") return false;
    
    // Specifically allowed: aquatic, walking, horizontal cycling
    const allowedTags = ["aquatic", "walking", "horizontal_cycling"];
    const hasAllowedTag = tags.some(tag => allowedTags.includes(tag));
    
    if (!hasAllowedTag) return false;
  }

  // Restrictions for seniors (> 65 years)
  if (profile.age >= 65) {
    // Avoid fall risk
    if (tags.includes("fall_risk")) return false;
  }

  return true;
};
