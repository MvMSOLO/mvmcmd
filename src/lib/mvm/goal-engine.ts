import type { MvmTaskStep } from "./task-planner";
import { planMvmTask } from "./task-planner";
import { getMvmSkill, type MvmSkill } from "./skills";

export type GoalStatus = "pending" | "running" | "achieved" | "partial" | "failed" | "cancelled" | "needs_clarification" | "needs_confirmation";
export type GoalRisk = "low" | "medium" | "high" | "unknown";
export interface MvmGoalStep { id:string; input:string; skillId?:string; dependsOn:string[]; requiredCapabilities:string[]; status:"pending"|"running"|"achieved"|"started"|"failed"|"skipped"; ok:boolean; verified:boolean; reason?:string; }
export interface MvmGoal { id:string; input:string; normalized:string; status:GoalStatus; risk:GoalRisk; steps:MvmGoalStep[]; outcome:{id:string; description:string; requiredStepIds:string[]}; createdAt:number; clarification?:string; confirmationReason?:string; }
export interface MvmGoalStepResult { stepId:string; status:MvmGoalStep["status"]; ok:boolean; verified:boolean; reason?:string; }
export interface MvmGoalRunResult { goal:MvmGoal; status:GoalStatus; ok:boolean; verified:boolean; achievedSteps:number; totalSteps:number; results:MvmGoalStepResult[]; stoppedOnFailure:boolean; }
function normalize(input:string){ return input.trim().replace(/\s+/g," ").toLocaleLowerCase(); }
function inferRisk(skills:MvmSkill[]):GoalRisk { if(!skills.length)return "unknown"; if(skills.some(s=>s.risk==="high"))return "high"; if(skills.some(s=>s.risk==="medium"))return "medium"; return "low"; }
function resolveSkill(input:string):MvmSkill|undefined { const q=normalize(input); return ["open-app","find-app","device-snapshot","permission-status","camera","qr","wallpaper","notification-center","app-bridge"].map(getMvmSkill).find((s)=>Boolean(s&&((s.aliases.some(a=>q.includes(normalize(a))))||q.includes(normalize(s.name))))); }
function stepsFromTask(input:string):MvmGoalStep[] { const plan=planMvmTask(input); const taskSteps:MvmTaskStep[]=plan?.steps??[{id:"step-1",input:input.trim(),dependsOn:[]}]; return taskSteps.map(step=>{const skill=resolveSkill(step.input); return {id:step.id,input:step.input,skillId:skill?.id,dependsOn:step.dependsOn,requiredCapabilities:skill?.requiredCapabilities??[],status:"pending",ok:false,verified:false};}); }
export function planMvmGoal(input:string):MvmGoal {
 const steps=stepsFromTask(input);
 const skills=steps.map(s=>s.skillId).filter((id):id is string=>Boolean(id)).map(id=>getMvmSkill(id)).filter((s):s is MvmSkill=>Boolean(s));
 const unknown=steps.find(s=>!s.skillId);
 const risk=inferRisk(skills);
 return {
  id:"goal-"+Date.now().toString(36), input:input.trim(), normalized:normalize(input),
  status: unknown ? "needs_clarification" : risk==="high" ? "needs_confirmation" : "pending",
  risk, steps,
  outcome:{id:"goal-outcome",description:"Every required goal step completed with explicit verification.",requiredStepIds:steps.map(s=>s.id)},
  createdAt:Date.now(),
  clarification: unknown ? `No registered skill can safely execute: ${unknown.input}` : undefined,
  confirmationReason: risk==="high" ? "This goal contains a high-risk registered skill and requires explicit confirmation." : undefined,
 };
}
export function runMvmGoal<T>(goal:MvmGoal,executeStep:(step:MvmGoalStep)=>T,evaluate:(value:T,step:MvmGoalStep)=>{ok:boolean;verified:boolean;reason?:string},options?:{confirmed?:boolean}):MvmGoalRunResult {
 if (goal.status === "needs_clarification") return {goal,status:"needs_clarification",ok:false,verified:false,achievedSteps:0,totalSteps:goal.steps.length,results:[],stoppedOnFailure:false};
 if (goal.status === "needs_confirmation" && !options?.confirmed) return {goal,status:"needs_confirmation",ok:false,verified:false,achievedSteps:0,totalSteps:goal.steps.length,results:[],stoppedOnFailure:false};
 const results:MvmGoalStepResult[]=[]; let status:GoalStatus="running";
 if (goal.status === "cancelled") {
  return { goal: {...goal, status:"cancelled"}, status:"cancelled", ok:false, verified:false, achievedSteps:0, totalSteps:goal.steps.length, results:goal.steps.map(step=>({stepId:step.id,status:"skipped",ok:false,verified:false,reason:"goal cancelled before execution"})), stoppedOnFailure:false };
 }
 for(const step of goal.steps){ const blocked=step.dependsOn.some(id=>!results.find(r=>r.stepId===id)?.ok); if(blocked){results.push({stepId:step.id,status:"skipped",ok:false,verified:false,reason:"dependency failed"});continue;} try{const value=executeStep(step);const checked=evaluate(value,step);const stepStatus=!checked.ok?"failed":checked.verified?"achieved":"started";results.push({stepId:step.id,status:stepStatus,ok:checked.ok,verified:checked.verified,reason:checked.reason});if(!checked.ok){status=results.some(r=>r.ok)?"partial":"failed";break;}}catch(error){const reason=error instanceof Error?error.message:"goal step failed";results.push({stepId:step.id,status:"failed",ok:false,verified:false,reason});status=results.some(r=>r.ok)?"partial":"failed";break;} }
 const totalSteps=goal.steps.length, achievedSteps=results.filter(r=>r.ok).length, complete=results.length===totalSteps&&results.every(r=>r.ok), verified=complete&&results.every(r=>r.verified); if(complete)status=verified?"achieved":"partial"; return {goal:{...goal,status},status,ok:complete,verified,achievedSteps,totalSteps,results,stoppedOnFailure:!complete&&results.some(r=>r.status==="failed")};
}
export function cancelMvmGoal(goal:MvmGoal):MvmGoal{return {...goal,status:"cancelled"};}
export function goalStatusLine(status:GoalStatus){return status.toUpperCase();}