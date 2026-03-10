import { describe, it, expect } from "vitest";
import { calculateBMI, classifyFitness, isExerciseCompatible, UserFitnessProfile, Exercise } from "../src/utils/fitness";

describe("Fitness Utils - BMI and Classification", () => {
  it("should calculate BMI correctly for a standard adult", () => {
    const profile: UserFitnessProfile = {
      height: 180,
      weight: 800, // 80kg
      age: 30,
      gender: "male",
    };
    // BMI = 80 / (1.8 * 1.8) = 80 / 3.24 = 24.69...
    expect(calculateBMI(profile)).toBe(24.7);
  });

  it("should classify fitness categories correctly", () => {
    const height = 180;
    const idealWeight = 22.5 * (1.8 * 1.8); // 72.9kg

    // Underweight: BMI < 18.5
    expect(classifyFitness({ height, weight: 550, age: 25, gender: "female" })).toBe("underweight");

    // Normal weight: BMI 18.5-25 and excess weight <= 5kg
    expect(classifyFitness({ height, weight: 750, age: 25, gender: "male" })).toBe("normal_weight");

    // Overweight light: excess weight 5-15kg
    expect(classifyFitness({ height, weight: 850, age: 25, gender: "male" })).toBe("overweight_light");

    // Overweight moderate: excess weight 15-30kg
    expect(classifyFitness({ height, weight: 1000, age: 25, gender: "male" })).toBe("overweight_moderate");

    // Obesity severe: excess weight > 30kg
    expect(classifyFitness({ height, weight: 1100, age: 25, gender: "male" })).toBe("obesity_severe");
  });
});

describe("Fitness Utils - Exercise Compatibility", () => {
  const highImpactEx: Exercise = { id: "1", name: "Burpees", impact: "high", tags: ["jump"] };
  const lowImpactEx: Exercise = { id: "2", name: "Walking", impact: "low", tags: ["walking"] };
  const aquaticEx: Exercise = { id: "3", name: "Swimming", impact: "low", tags: ["aquatic"] };
  const fallRiskEx: Exercise = { id: "4", name: "Balance beam", impact: "low", tags: ["fall_risk"] };

  it("should restrict high impact exercises for severe obesity", () => {
    const obeseProfile: UserFitnessProfile = { height: 170, weight: 1100, age: 30, gender: "male" }; // Excess ~45kg
    expect(classifyFitness(obeseProfile)).toBe("obesity_severe");
    
    expect(isExerciseCompatible(highImpactEx, obeseProfile)).toBe(false);
    expect(isExerciseCompatible(lowImpactEx, obeseProfile)).toBe(true);
    expect(isExerciseCompatible(aquaticEx, obeseProfile)).toBe(true);
  });

  it("should restrict specific exercises for elderly users", () => {
    const elderlyProfile: UserFitnessProfile = { height: 170, weight: 700, age: 70, gender: "female" };
    expect(isExerciseCompatible(fallRiskEx, elderlyProfile)).toBe(false);
    expect(isExerciseCompatible(lowImpactEx, elderlyProfile)).toBe(true);
  });
});
