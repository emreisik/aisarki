/**
 * Feature gate helpers — plan özelliklerine göre kullanıcının bir özelliğe
 * erişimi olup olmadığını sorgular.
 */

import { getUserPlan } from "./credits";
import type { PlanFeatures } from "./plans";

export async function hasFeature(
  userId: string,
  key: keyof PlanFeatures,
): Promise<boolean> {
  const plan = await getUserPlan(userId);
  const v = plan.features[key];
  return typeof v === "boolean" ? v : false;
}

export async function getAccessibleModels(userId: string): Promise<string[]> {
  const plan = await getUserPlan(userId);
  return [...plan.features.models];
}

export async function getUploadMaxSeconds(userId: string): Promise<number> {
  const plan = await getUserPlan(userId);
  return plan.features.uploadMaxMinutes * 60;
}

export async function canUseModel(
  userId: string,
  model: string,
): Promise<boolean> {
  const models = await getAccessibleModels(userId);
  return models.includes(model);
}
