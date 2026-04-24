import { requireRole } from "@/lib/requireRole";
import { JOBS } from "@/lib/job-catalog";
import { getJobStatuses } from "@/lib/jobs";
import JobCard from "./JobCard";

export const metadata = { title: "Jobs · Rifmo Admin" };

const CATEGORIES: { key: string; label: string }[] = [
  { key: "ops", label: "Operasyonel" },
  { key: "maintenance", label: "Bakım" },
  { key: "debug", label: "Debug" },
  { key: "smoke", label: "Smoke test" },
];

export default async function JobsPage() {
  await requireRole("admin");

  const statuses = await getJobStatuses(JOBS.map((j) => j.name));

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-semibold tracking-tight">Jobs</h1>
        <p className="text-sm text-[var(--text2)] mt-1">
          Script'leri terminalden çalıştır;{" "}
          <code className="text-xs">_jobRun.mjs</code> helper'ını kullananlar
          son run durumunu buraya yazar.
        </p>
      </div>

      {CATEGORIES.map((cat) => {
        const jobsInCat = JOBS.filter((j) => j.category === cat.key);
        if (jobsInCat.length === 0) return null;
        return (
          <section key={cat.key} className="mb-8">
            <h2 className="text-xs font-medium uppercase tracking-wider text-[var(--text3)] mb-3">
              {cat.label}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {jobsInCat.map((job) => (
                <JobCard
                  key={job.name}
                  job={job}
                  status={statuses.get(job.name) ?? null}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
