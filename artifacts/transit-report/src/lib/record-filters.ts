export type ReportSourceFilter = "any" | "rider" | "511" | "ai";
export type ReportLanguageFilter = "any" | "vi" | "en" | "es" | "pa";

export type ReportFilters = {
  reference: string;
  source: ReportSourceFilter;
  language: ReportLanguageFilter;
};

type FilterableReport = {
  reference: string;
  language: string;
  inputIsSynthetic?: boolean | null;
  inputSource?: string | null;
  description?: string | null;
  dataSource?: string | null;
  sfBay511DataUsed?: boolean | null;
  responseKind?: string | null;
};

export function filterReports<T extends FilterableReport>(
  reports: T[],
  filters: ReportFilters,
): T[] {
  const query = filters.reference.trim().toLocaleLowerCase();
  return reports.filter((report) => {
    if (query && !report.reference.toLocaleLowerCase().includes(query)) return false;
    if (filters.language !== "any" && report.language !== filters.language) return false;
    if (filters.source === "511" && report.sfBay511DataUsed !== true) return false;
    if (filters.source === "ai" && report.responseKind !== "ai_generated") return false;
    if (filters.source === "rider") {
      const isSynthetic =
        report.inputIsSynthetic === true ||
        report.description?.includes("[242]") === true ||
        report.dataSource === "synthetic data";
      if (isSynthetic || report.inputSource !== "rider-submitted input") return false;
    }
    return true;
  });
}