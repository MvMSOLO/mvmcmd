import assert from "node:assert/strict";
import test from "node:test";
import { cancelMvmGoal, planMvmGoal, runMvmGoal } from "./goal-engine.ts";

test("plans a multi-step goal from the existing task planner",()=>{const g=planMvmGoal("open settings and then find camera");assert.equal(g.steps.length,2);assert.deepEqual(g.steps[1].dependsOn,["step-1"]);assert.equal(g.status,"pending");});
test("goal is achieved only when every step is explicitly verified",()=>{const g=planMvmGoal("open settings and then find camera");const r=runMvmGoal(g,()=>({ok:true}),()=>({ok:true,verified:true}));assert.equal(r.status,"achieved");assert.equal(r.verified,true);assert.equal(r.achievedSteps,2);});
test("unverified successful steps remain partial, not achieved",()=>{const g=planMvmGoal("open settings");const r=runMvmGoal(g,()=>({ok:true}),()=>({ok:true,verified:false,reason:"external completion unknown"}));assert.equal(r.status,"partial");assert.equal(r.ok,true);assert.equal(r.verified,false);});
test("failed dependent goal stops truthfully",()=>{const g=planMvmGoal("open settings and then find camera");const r=runMvmGoal(g,()=>({}),(_v,s)=>s.id==="step-1"?{ok:false,verified:false,reason:"blocked"}:{ok:true,verified:true});assert.equal(r.status,"failed");assert.equal(r.stoppedOnFailure,true);});
test("cancelled goals never execute steps",()=>{const g=cancelMvmGoal(planMvmGoal("open settings and then find camera"));let calls=0;const r=runMvmGoal(g,()=>{calls++;return {};},()=>({ok:true,verified:true}));assert.equal(calls,0);assert.equal(r.status,"cancelled");});


test("unknown goal steps request clarification and never execute",()=>{const g=planMvmGoal("do something unsupported");assert.equal(g.status,"needs_clarification");let calls=0;const r=runMvmGoal(g,()=>{calls++;return {};},()=>({ok:true,verified:true}));assert.equal(calls,0);assert.equal(r.status,"needs_clarification");});

test("high-risk goals require explicit confirmation before execution",()=>{const g={...planMvmGoal("open settings"),risk:"high" as const,status:"needs_confirmation" as const,confirmationReason:"confirm"};let calls=0;const r=runMvmGoal(g,()=>{calls++;return {};},()=>({ok:true,verified:true}));assert.equal(calls,0);assert.equal(r.status,"needs_confirmation");const confirmed=runMvmGoal(g,()=>({}),()=>({ok:true,verified:true}),{confirmed:true});assert.equal(confirmed.status,"achieved");});