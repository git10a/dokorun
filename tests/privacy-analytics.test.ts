import { describe, expect, it, vi, afterEach } from "vitest";
import { analyticsPath, sanitizeAnalyticsMeta } from "@/lib/analytics-privacy";
import { authSecret } from "@/lib/auth-privacy";
import { readLocalLocation, saveLocalLocation } from "@/lib/local-location";

afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();vi.useRealTimers();});
describe("data minimization boundaries",()=>{
 it("rejects free text, exact coordinates and identifiers outside the supported schema",()=>{
  expect(sanitizeAnalyticsMeta({q:"home address",lat:35.1,lng:139.2,email:"user@example.com",userId:"user",message:"secret",accessToken:"token",visitorId:"user@example.com",hasQuery:true,slug:"kokyo",internal:false})).toEqual({hasQuery:true,slug:"kokyo",internal:false});
  expect(analyticsPath("/me/logs/user-record-id?lat=35.1")).toBe("/me");
  expect(analyticsPath("/u/user-email-name")).toBe("/u");
  expect(analyticsPath("/spots/kokyo?token=secret")).toBe("/spots/kokyo");
 });
 it("fails closed without a real production signing secret",()=>{
  vi.stubEnv("NODE_ENV","production");vi.stubEnv("BETTER_AUTH_SECRET","");expect(()=>authSecret()).toThrow();
  vi.stubEnv("BETTER_AUTH_SECRET","tiny");expect(()=>authSecret()).toThrow();
 });
 it("keeps exact coordinates in tab storage only and expires them after five minutes",()=>{
  const values=new Map<string,string>(); const storage={getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>values.set(k,v),removeItem:(k:string)=>values.delete(k)};
  vi.stubGlobal("sessionStorage",storage);vi.stubGlobal("window",{dispatchEvent:vi.fn()});vi.useFakeTimers();
  saveLocalLocation({lat:35.123456,lng:139.123456});expect(readLocalLocation()).toEqual({lat:35.123456,lng:139.123456});
  vi.advanceTimersByTime(300001);expect(readLocalLocation()).toBeNull();expect(values.size).toBe(0);
 });
});
