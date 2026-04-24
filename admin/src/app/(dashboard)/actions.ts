"use server";

import { redirect } from "next/navigation";
import { signOut } from "@/auth";

export async function logoutAction(): Promise<void> {
  await signOut({ redirect: false });
  redirect("/login");
}
