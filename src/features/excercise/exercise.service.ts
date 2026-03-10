import { exercises } from "../../db/schema";
import { DBType } from "../../types";

export default class ExerciseService {
  constructor(private db: DBType) {}

  async findAllExercises() {
    return await this.db.select().from(exercises);
  }
}