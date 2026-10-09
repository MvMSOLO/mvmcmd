export type PerformanceMetricName =
  | "renderer-ready-ms" | "command-parse-ms" | "input-route-ms" | "frame-rate-fps" | "heap-mb";
export type PerformanceVerdict = "pass" | "warning" | "fail" | "unmeasured";
export interface PerformanceMeasurement {
  name: PerformanceMetricName; value: number; unit: "ms" | "fps" | "MB"; source: string; observedAt: number;
}
export interface PerformanceAssessment {
  name: PerformanceMetricName; label: string; unit: "ms" | "fps" | "MB"; value?: number;
  verdict: PerformanceVerdict; budget: string; source?: string;
}
const DEFINITIONS: Record<PerformanceMetricName, { labelUz:string; labelEn:string; unit:"ms"|"fps"|"MB"; budget:string; pass:(n:number)=>boolean; warning:(n:number)=>boolean }> = {
  "renderer-ready-ms": { labelUz:"Renderer tayyor bo‘lishi", labelEn:"Renderer ready (navigation-relative)", unit:"ms", budget:"≤ 3000 ms", pass:n=>n<=3000, warning:n=>n<=6000 },
  "command-parse-ms": { labelUz:"Buyruqni tushunish va parse", labelEn:"Command understanding + parse", unit:"ms", budget:"≤ 16 ms", pass:n=>n<=16, warning:n=>n<=50 },
  "input-route-ms": { labelUz:"Inputdan route qarorigacha", labelEn:"Input-to-route dispatch", unit:"ms", budget:"≤ 100 ms", pass:n=>n<=100, warning:n=>n<=250 },
  "frame-rate-fps": { labelUz:"Ilova frame cadence (3D GPU-only emas)", labelEn:"App frame cadence (not GPU-only)", unit:"fps", budget:"≥ 45 FPS", pass:n=>n>=45, warning:n=>n>=30 },
  "heap-mb": { labelUz:"JavaScript heap", labelEn:"JavaScript heap", unit:"MB", budget:"≤ 250 MB", pass:n=>n<=250, warning:n=>n<=350 },
};
let measurements: PerformanceMeasurement[] = [];
const MAX_SAMPLES = 60;
export function recordPerformanceMeasurement(name: PerformanceMetricName, value: number, source: string, observedAt = Date.now()): boolean {
  if (!Number.isFinite(value) || value < 0 || !Number.isFinite(observedAt)) return false;
  if (name === "frame-rate-fps" && value > 240) return false;
  if (name === "renderer-ready-ms" && value > 120_000) return false;
  if ((name === "command-parse-ms" || name === "input-route-ms") && value > 60_000) return false;
  if (name === "heap-mb" && value > 16_384) return false;
  measurements = [...measurements, { name, value, unit:DEFINITIONS[name].unit, source:String(source).slice(0,120), observedAt }].slice(-MAX_SAMPLES);
  return true;
}
export function clearPerformanceMeasurements(): void { measurements = []; }
export function getPerformanceMeasurements(): PerformanceMeasurement[] { return measurements.map((item) => ({ ...item })); }
export function assessPerformanceMetric(name: PerformanceMetricName, value?: number, source?: string): PerformanceAssessment {
  const d=DEFINITIONS[name];
  if (value === undefined || !Number.isFinite(value) || value < 0) return {name,label:d.labelEn,unit:d.unit,verdict:"unmeasured",budget:d.budget,...(source?{source}:{})};
  const verdict:PerformanceVerdict=d.pass(value)?"pass":d.warning(value)?"warning":"fail";
  return {name,label:d.labelEn,unit:d.unit,value,verdict,budget:d.budget,...(source?{source}:{})};
}
export function latestPerformanceAssessment(name: PerformanceMetricName): PerformanceAssessment {
  const d=DEFINITIONS[name]; const sample=[...measurements].reverse().find((item)=>item.name===name);
  if(!sample)return {name,label:d.labelEn,unit:d.unit,verdict:"unmeasured",budget:d.budget};
  return {...assessPerformanceMetric(name,sample.value,sample.source),label:d.labelEn};
}
export function formatPerformanceReport(lang:"uz"|"en"):string[] {
  const names:PerformanceMetricName[]=["renderer-ready-ms","command-parse-ms","input-route-ms","frame-rate-fps","heap-mb"];
  const result=names.map((name)=>{
    const item=latestPerformanceAssessment(name);
    const label=DEFINITIONS[name][lang==="uz"?"labelUz":"labelEn"];
    const value=item.value===undefined?(lang==="uz"?"o‘lchanmagan":"unmeasured"):item.value.toLocaleString(lang==="uz"?"uz-UZ":"en-GB",{maximumFractionDigits:1})+" "+item.unit;
    const verdict=item.verdict==="pass"?"PASS":item.verdict==="warning"?"WARNING":item.verdict==="fail"?"FAIL":"UNMEASURED";
    return label+": "+value+" · "+verdict+" · budget "+item.budget+(item.source?" · source "+item.source:"");
  });
  result.push(lang==="uz"
    ?"Battery sarfi: O‘LCHANMAGAN — bu sessiyada ishonchli drain o‘lchagich yo‘q; taxmin berilmaydi."
    :"Battery drain: UNMEASURED — this session has no reliable drain collector; no estimate is substituted.");
  result.push(lang==="uz"
    ?"Eslatma: frame cadence ilova bo‘yicha requestAnimationFrame namunasi; alohida GPU/render benchmarki emas."
    :"Note: frame cadence is an app-wide requestAnimationFrame sample, not a GPU-only rendering benchmark.");
  return result;
}
