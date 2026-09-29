#!/usr/bin/env python3
import argparse,json,re,math
from pathlib import Path
from collections import defaultdict,Counter

CRITICAL=("dedHealth","dedTax","performance")
ALL_FIELDS=("base","shiftAllowance","meal","performance","transport","otPay","dedLabor","dedHealth","dedWelfare","dedPension","dedAttendance","dedTax","dedHealthExtra","actualNet")

def digits(s):
    return [int(x.replace(",","")) for x in re.findall(r"\d[\d,]*",str(s)) if x.replace(",","").isdigit()]

def center(bb):
    return ((bb[0]+bb[2])/2,(bb[1]+bb[3])/2)

def near_observations(observations,bb,limit=8):
    cx,cy=center(bb)
    ranked=[]
    for o in observations:
        ob=o.get("bbox") or [0,0,0,0]
        ox,oy=center(ob)
        dx=(ox-cx);dy=(oy-cy)
        d=math.hypot(dx,dy)
        overlap=max(0,min(bb[2],ob[2])-max(bb[0],ob[0]))*max(0,min(bb[3],ob[3])-max(bb[1],ob[1]))
        ranked.append((0 if overlap>0 else 1,d,-overlap,o))
    return [x[-1] for x in sorted(ranked)[:limit]]

def norm_label(s):
    return re.sub(r"[\s,，.。:：;；()（）_\-/]","",str(s)).upper()

def pure_digits(text):
    t=re.sub(r"[\s,，,]","",str(text))
    return t if t.isdigit() else ""

def stitched_numeric_candidates(observations):
    numeric=[]
    for o in observations:
        d=pure_digits(o.get("text",""))
        if not d: continue
        bb=o.get("bbox") or [0,0,0,0]
        numeric.append((bb,d))
    numeric.sort(key=lambda x:(round(((x[0][1]+x[0][3])/2)/8),x[0][0]))
    out=[]
    for i in range(len(numeric)):
        combined=numeric[i][1]
        box=list(numeric[i][0])
        out.append(int(combined))
        for j in range(i+1,min(len(numeric),i+3)):
            nb,nd=numeric[j]
            h1=max(1,box[3]-box[1]);h2=max(1,nb[3]-nb[1])
            overlap=max(0,min(box[3],nb[3])-max(box[1],nb[1]))
            gap=nb[0]-box[2]
            avg=(h1+h2)/2
            if overlap<min(h1,h2)*.45 or gap<(-avg*.18) or gap>max(14,avg*.9):
                break
            combined+=nd
            if len(combined)>8: break
            out.append(int(combined))
            box=[min(box[0],nb[0]),min(box[1],nb[1]),max(box[2],nb[2]),max(box[3],nb[3])]
    return out

def row_text_candidates(observations,bb):
    if not observations:return []
    h=max(20,bb[3]-bb[1]); cy=(bb[1]+bb[3])/2
    row=[]
    for o in observations:
        ob=o.get("bbox") or [0,0,0,0]
        oy=(ob[1]+ob[3])/2
        overlap=max(0,min(bb[3]+h*1.2,ob[3])-max(bb[1]-h*1.2,ob[1]))
        if abs(oy-cy)<=max(60,h*2.2) or overlap>0:
            row.append(o)
    row=sorted(row,key=lambda o:(o.get("bbox") or [0,0,0,0])[0])
    texts=[norm_label(o.get("text","")) for o in row if norm_label(o.get("text",""))]
    out=set(texts)
    for i in range(len(texts)):
        acc=""
        for j in range(i,min(len(texts),i+5)):
            acc+=texts[j]
            if acc: out.add(acc)
    return list(out)

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--manifest",required=True)
    ap.add_argument("--vision",required=True)
    ap.add_argument("--out",required=True)
    args=ap.parse_args()
    manifest={r["id"]:r for r in (json.loads(x) for x in Path(args.manifest).read_text(encoding="utf-8").splitlines() if x.strip())}
    vision={r["id"]:r for r in (json.loads(x) for x in Path(args.vision).read_text(encoding="utf-8").splitlines() if x.strip())}
    stats={split:{"cases":0,"fields":Counter(),"field_total":Counter(),"micro":Counter(),"micro_total":Counter(),"extras_amount_ok":0,"extras_label_ok":0,"extras_total":0} for split in ("tune","holdout")}
    confusions={split:Counter() for split in ("tune","holdout")}

    for cid,m in manifest.items():
        v=vision.get(cid,{"observations":[],"digitCrops":{}})
        split=m["split"];st=stats[split];st["cases"]+=1
        obs=v.get("observations",[])
        gt=m["ground_truth"];boxes=m["field_boxes"]
        for key in ALL_FIELDS:
            if key not in boxes or key not in gt: continue
            target=int(gt[key]);st["field_total"][key]+=1
            nearby=near_observations(obs,boxes[key],limit=8)
            seen=[]
            ok=False
            for o in nearby:
                ds=digits(o.get("text",""));seen+=ds
                if target in ds:ok=True;break
            stitched=stitched_numeric_candidates(nearby)
            seen+=stitched
            if target in stitched: ok=True
            if ok:st["fields"][key]+=1
            elif key in CRITICAL:
                for x in seen[:6]:
                    confusions[split][(key,target,x)]+=1

        for key in CRITICAL:
            if key not in gt:continue
            st["micro_total"][key]+=1
            info=(v.get("digitCrops") or {}).get(key) or {}
            ds=digits(info.get("text",""))
            if int(gt[key]) in ds:st["micro"][key]+=1
            elif ds:
                confusions[split][(key,int(gt[key]),ds[0])]+=1

        label_obs=v.get("labelObservations",[]) or obs
        for extra in m.get("extras",[]):
            st["extras_total"]+=1
            nearby=near_observations(obs,extra["bbox"],limit=8)
            target=int(extra["amount"]);label=norm_label(extra["label"])
            amount_candidates=[]
            for o in nearby: amount_candidates+=digits(o.get("text",""))
            amount_candidates+=stitched_numeric_candidates(nearby)
            amount_ok=target in amount_candidates
            label_candidates=row_text_candidates(label_obs,extra["bbox"])
            label_ok=any(label and label in candidate for candidate in label_candidates)
            st["extras_amount_ok"]+=int(amount_ok)
            st["extras_label_ok"]+=int(label_ok)

    out={"splits":{},"top_confusions":[]}
    for split,st in stats.items():
        field_acc={k:(st["fields"][k]/st["field_total"][k] if st["field_total"][k] else None) for k in ALL_FIELDS}
        micro_acc={k:(st["micro"][k]/st["micro_total"][k] if st["micro_total"][k] else None) for k in CRITICAL}
        total_correct=sum(st["fields"].values());total=sum(st["field_total"].values())
        out["splits"][split]={
            "cases":st["cases"],
            "field_accuracy":field_acc,
            "field_counts":{k:{"correct":st["fields"][k],"total":st["field_total"][k]} for k in ALL_FIELDS},
            "overall_field_accuracy":total_correct/total if total else 0,
            "critical_microcrop_accuracy":micro_acc,
            "micro_counts":{k:{"correct":st["micro"][k],"total":st["micro_total"][k]} for k in CRITICAL},
            "extra_amount_recall":st["extras_amount_ok"]/st["extras_total"] if st["extras_total"] else 0,
            "extra_label_recall":st["extras_label_ok"]/st["extras_total"] if st["extras_total"] else 0,
            "extra_amount_correct":st["extras_amount_ok"],
            "extra_label_correct":st["extras_label_ok"],
            "extra_total":st["extras_total"]
        }
    out["top_confusions_by_split"]={
        split:[{"field":k[0],"expected":k[1],"read":k[2],"count":n} for k,n in confusions[split].most_common(30)]
        for split in ("tune","holdout")
    }
    Path(args.out).write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding="utf-8")
    print(json.dumps(out,ensure_ascii=False,indent=2))

if __name__=="__main__":main()
