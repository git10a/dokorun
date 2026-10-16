import json,pathlib,sys,shutil,collections
base=pathlib.Path(__file__).parent
mode=sys.argv[1];r=json.loads(sys.argv[2]);filename='reviewed-references.json' if mode=='reference' else 'sources-and-prompts.json'
p=base/filename;a=json.loads(p.read_text()) if p.exists() else []
if mode=='accept':
 r['generatedPath']=str(base.resolve()/'assets'/f"{r['slug']}-{r['id']}.png")
 shutil.copyfile(r['generatedOriginalPath'],r['generatedPath'])
 r['reviewStatus']='accepted'
a=[x for x in a if (x['slug'],x['id'])!=(r['slug'],r['id'])];a.append(r);p.write_text(json.dumps(a,ensure_ascii=False,indent=2)+'\n')
if mode=='accept':
 count=collections.Counter(x['slug'] for x in a);complete=sorted(s for s,n in count.items() if n>=2)
 prog=base/'progress.json';v=json.loads(prog.read_text());v.update(reviewedImages=len(a),completeSpots=complete,remainingSpots=80-len(complete),updatedAt='2026-10-16')
 if len(sys.argv)>3:v['inProgress']=[sys.argv[3]]
 prog.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n')
print(mode,r['slug'],r['id'])
