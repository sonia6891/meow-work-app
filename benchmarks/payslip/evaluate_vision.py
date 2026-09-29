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

def near_observations(observations,bb):
    cx,cy=center(bb)
    ranked=[]
    for o in observations:
        ob=o.get("bbox") or [0,0,0,0]
        ox,oy=center(ob)
        dx=(ox-cx);dy=(oy-cy)
        d=math.hypot(dx,dy)
        overlap=max(0,min(bb[2],ob[2])-max(bb[0],ob[0]))*max(0,min(bb[3],ob[3])-max(bb[1],ob[1]))
        ranked.append((0 if overlap>0 else 1,d,-overlap,o))
    return [x[-1] for x in sorted(ranked)[:5]]

def norm_label(s):
    return re.sub(r"[\s,，.。:：;；()（）_\-/]","",str(s)).upper()

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--manifest",required=True)
    ap.add_argument("--vision",required=True)
    ap.add_argument("--out",required=True)
    args=ap.parse_args()
    manifest={r["id"]:r for r in (json.loads(x) for x in Path(args.manifest).read_text(encoding="utf-8").splitlines() if x.strip())}
    vision={r["id"]:r for r in (json.loads(x) for x in Path(args.vision).read_text(encoding="utf-8").splitlines() if x.strip())}
    stats={split:{"cases":0,"fields":Counter(),"field_total":Counter(),"micro":Counter(),"micro_total":Counter(),"extras_amount_ok":0,"extras_label_ok":0,"extras_total":0} for split in ("tune","holdout")}
    confusions=Counter()

    for cid,m in manifest.items():
        v=vision.get(cid,{"observations":[],"digitCrops":{}})
        split=m["split"];st=stats[split];st["cases"]+=1
        obs=v.get("observations",[])
        gt=m["ground_truth"];boxes=m["field_boxes"]
        for key in ALL_FIELDS:
            if key not in boxes or key not in gt: continue
            target=int(gt[key]);st["field_total"][key]+=1
            nearby=near_observations(obs,boxes[key])
            seen=[]
            ok=False
            for o in nearby:
                ds=digits(o.get("text",""));seen+=ds
                if target in ds:ok=True;break
            if ok:st["fields"][key]+=1
            elif key in CRITICAL:
                for x in seen[:4]:
                    confusions[(key,target,x)]+=1

        for key in CRITICAL:
            if key not in gt:continue
            st["micro_total"][key]+=1
            info=(v.get("digitCrops") or {}).get(key) or {}
            ds=digits(info.get("text",""))
            if int(gt[key]) in ds:st["micro"][key]+=1
            elif ds:
                confusions[(key,int(gt[key]),ds[0])]+=1

        for extra in m.get("extras",[]):
            st["extras_total"]+=1
            nearby=near_observations(obs,extra["bbox"])
            target=int(extra["amount"]);label=norm_label(extra["label"])
            amount_ok=any(target in digits(o.get("text","")) for o in nearby)
            label_ok=any(label and label in norm_label(o.get("text","")) for o in nearby)
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
            "overall_field_accuracy":total_correct/total if total else 0,
            "critical_microcrop_accuracy":micro_acc,
            "extra_amount_recall":st["extras_amount_ok"]/st["extras_total"] if st["extras_total"] else 0,
            "extra_label_recall":st["extras_label_ok"]/st["extras_total"] if st["extras_total"] else 0,
            "extra_total":st["extras_total"]
        }
    out["top_confusions"]=[{"field":k[0],"expected":k[1],"read":k[2],"count":n} for k,n in confusions.most_common(30)]
    Path(args.out).write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding="utf-8")
    print(json.dumps(out,ensure_ascii=False,indent=2))

if __name__=="__main__":main()
