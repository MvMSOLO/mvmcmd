import assert from "node:assert/strict";
import test from "node:test";
import { cancelMvmGoal, planMvmGoal, runMvmGoal } from "./goal-engine.ts";

test("plans a multi-step goal from the existing task planner",()=>{const g=planMvmGoal("open settings and then find camera");assert.equal(g.steps.length,2);assert.deepEqual(g.steps[1].dependsOn,["step-1"]);assert.equal(g.status,"pending");});
test("goal is achieved only when every step is explicitly verified",()=>{const g=planMvmGoal("open settings and then find camera");const r=runMvmGoal(g,()=>({ok:true}),()=>({ok:true,verified:true}));assert.equal(r.status,"achieved");assert.equal(r.verified,true);assert.equal(r.achievedSteps,2);});
test("unverified successful steps remain partial, not achieved",()=>{const g=planMvmGoal("open settings");const r=runMvmGoal(g,()=>({ok:true}),()=>({ok:true,verified:false,reason:"external completion unknown"}));assert.equal(r.status,"partial");assert.equal(r.ok,true);assert.equal(r.verified,false);});
test("failed dependent goal stops truthfully",()=>{const g=planMvmGoal("open settings and then find camera");const r=runMvmGoal(g,()=>({}),(_v,s)=>s.id==="step-1"?{ok:false,verified:false,reason:"blocked"}:{ok:true,verified:true});assert.equal(r.status,"failed");assert.equal(r.stoppedOnFailure,true);});
test("cancelled goals never execute steps",()=>{const g=cancelMvmGoal(planMvmGoal("open settings and then find camera"));let calls=0;const r=runMvmGoal(g,()=>{calls++;return {};},()=>({ok:true,verified:true}));assert.equal(calls,0);assert.equal(r.status,"cancelled");});
