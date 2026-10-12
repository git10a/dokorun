import { expect, it, vi } from "vitest";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { readFileSync } from "node:fs";
import * as schema from "@/db/schema";
const mocks=vi.hoisted(()=>({getDb:vi.fn()}));
vi.mock("@/db",()=>({getDb:mocks.getDb}));
vi.mock("next/cache",()=>({unstable_cache:(fn:unknown)=>fn}));
import { getNearbySpotCandidates } from "@/db/data";
import { distanceBetweenKm } from "@/lib/spot-search";

it("includes the closest course even when it lies beyond the first 100 search results",async()=>{
 const client=createClient({url:":memory:"});
 try{
  await client.executeMultiple(readFileSync("drizzle/0000_init.sql","utf8"));
  const inserts=[];
  for(let i=0;i<201;i++){
   inserts.push({sql:"INSERT INTO spots(id,slug,name,name_kana,prefecture,city,lat,lng,description,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)",args:[String(i),`spot-${i}`,`Spot ${i}`,String(i),"東京都","千代田区",i===200?35:40,139,"Test",201-i]});
   inserts.push({sql:"INSERT INTO courses(id,spot_id,distance_m,course_type,surface) VALUES (?,?,5000,'loop','asphalt')",args:[String(i),String(i)]});
  }
  await client.batch(inserts,"write");mocks.getDb.mockReturnValue(drizzle(client,{schema}));
  const result=await getNearbySpotCandidates({sort:"near"});expect(result.spots).toHaveLength(201);
  const nearest=result.spots.sort((a,b)=>distanceBetweenKm(35,139,a.lat,a.lng)-distanceBetweenKm(35,139,b.lat,b.lng))[0];expect(nearest.slug).toBe("spot-200");
 }finally{client.close();}
});
