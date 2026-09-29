#!/usr/bin/env python3
import argparse, json, math, os, random
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageEnhance, ImageFilter, ImageOps

W,H=1180,1600

FIELD_ALIASES={
 "base":["底薪","本薪","基本薪資","基本工資"],
 "shiftAllowance":["輪班津貼","夜班津貼","班別加給","大夜津貼"],
 "meal":["伙食津貼"],
 "performance":["表現津貼","績效獎金","績效津貼","工作獎金"],
 "transport":["交通津貼","通勤補助"],
 "otPay":["加班費","延長工時工資","免稅加班費"],
 "dedLabor":["勞保費","勞工保險費"],
 "dedHealth":["健保費","全民健保費","健康保險費"],
 "dedWelfare":["福利金","職工福利金"],
 "dedPension":["勞退自提","退休金自提"],
 "dedAttendance":["考勤扣款","請假扣款","缺勤扣款"],
 "dedTax":["所得稅","薪資所得稅","扣繳稅額"],
 "dedHealthExtra":["健保補扣","補充保費"],
 "actualNet":["實發金額","實領金額","淨額","入帳金額"],
}
EXTRA_INCOME=["餐費補助","專案獎金","特殊津貼","職務加給","誤餐費","伙食補助"]
EXTRA_DED=["工會費","停車費","團保費","代扣款","宿舍費","制服費"]

def find_font(size,bold=False):
    candidates=[
      "/System/Library/Fonts/PingFang.ttc",
      "/System/Library/Fonts/STHeiti Medium.ttc",
      "/System/Library/Fonts/Hiragino Sans GB.ttc",
      "/Library/Fonts/Arial Unicode.ttf",
      "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
    ]
    for p in candidates:
        if os.path.exists(p):
            try: return ImageFont.truetype(p,size,index=2 if bold and p.endswith(".ttc") else 0)
            except Exception:
                try: return ImageFont.truetype(p,size)
                except Exception: pass
    return ImageFont.load_default()

def money(n,comma=True):
    return f"{int(n):,}" if comma else str(int(n))

def draw_text(draw,xy,text,font,fill=(18,18,18),anchor=None):
    draw.text(xy,str(text),font=font,fill=fill,anchor=anchor)

def bbox_text(draw,xy,text,font,anchor=None):
    return draw.textbbox(xy,str(text),font=font,anchor=anchor)

def add_row(draw,label,value,x_label,x_value,y,font,label_font=None,comma=True,align="right"):
    lf=label_font or font
    draw_text(draw,(x_label,y),label,lf)
    text=money(value,comma)
    anchor="ra" if align=="right" else None
    draw_text(draw,(x_value,y),text,font,anchor=anchor)
    bb=draw.textbbox((x_value,y),text,font=font,anchor=anchor)
    return [bb[0],bb[1],bb[2],bb[3]]

def case_values(rng,idx):
    base=rng.randrange(280,780)*100
    shift=rng.choice([0,800,1200,1800,2400,3200,4500,5120,6000,7800])
    meal=rng.choice([0,600,1200,1800,2400,3000])
    perf=rng.choice([0,300,650,800,1000,1300,1500,2000,2600,3200])
    transport=rng.choice([0,300,500,800,1200,1500])
    ot=rng.choice([0,420,840,1260,1800,2400,3360,4200,5600,7200])
    labor=rng.choice([684,721,760,794,839,876,918,1002,1100,1210])
    health=rng.choice([622,690,725,781,812,835,859,886,918,959,1008,1188])
    welfare=rng.choice([0,100,120,150,180,200,300])
    pension=rng.choice([0,500,800,1000,1200,1500,1800,2400])
    attendance=rng.choice([0,173,337,500,673,1000,1346])
    tax=rng.choice([0,15,37,58,73,82,97,105,120,180,260,300,450,680,950])
    health_extra=rng.choice([0,0,0,100,150,220,350])
    # Oversample the hard confusions without making them the whole benchmark.
    if idx%29==0: health=859
    if idx%31==0: health=959
    if idx%37==0: tax=97
    if idx%41==0: perf=1300
    extras=[]
    if rng.random()<0.46:
        extras.append({"label":rng.choice(EXTRA_INCOME),"amount":rng.choice([300,450,500,650,800,1000,1200,1500,2000]),"kind":"income"})
    if rng.random()<0.23:
        extras.append({"label":rng.choice(EXTRA_DED),"amount":rng.choice([80,100,120,150,200,300,450,650]),"kind":"deduction"})
    inc=base+shift+meal+perf+transport+ot+sum(x["amount"] for x in extras if x["kind"]=="income")
    ded=labor+health+welfare+pension+attendance+tax+health_extra+sum(x["amount"] for x in extras if x["kind"]=="deduction")
    return dict(base=base,shiftAllowance=shift,meal=meal,performance=perf,transport=transport,otPay=ot,
      dedLabor=labor,dedHealth=health,dedWelfare=welfare,dedPension=pension,dedAttendance=attendance,dedTax=tax,
      dedHealthExtra=health_extra,actualNet=inc-ded,extras=extras)

def label_for(rng,key):
    return rng.choice(FIELD_ALIASES[key])

def rotate_bbox(bb,angle):
    if not angle:return bb
    a=math.radians(angle);c=math.cos(a);si=math.sin(a);cx,cy=W/2,H/2
    pts=[]
    for x,y in ((bb[0],bb[1]),(bb[2],bb[1]),(bb[2],bb[3]),(bb[0],bb[3])):
        dx,dy=x-cx,y-cy
        # PIL positive angle rotates counter-clockwise in image coordinates.
        nx=c*dx+si*dy+cx; ny=-si*dx+c*dy+cy
        pts.append((nx,ny))
    xs=[p[0] for p in pts];ys=[p[1] for p in pts]
    return [max(0,min(xs)),max(0,min(ys)),min(W,max(xs)),min(H,max(ys))]

def save_critical_crops(im,field_boxes,out_dir,idx):
    crops={}
    crop_dir=out_dir/"crops";crop_dir.mkdir(exist_ok=True)
    for key in ("dedHealth","dedTax","performance"):
        bb=field_boxes.get(key)
        if not bb:continue
        x0,y0,x1,y1=bb
        pad_x=max(20,(x1-x0)*1.1);pad_y=max(16,(y1-y0)*1.0)
        rect=(max(0,int(x0-pad_x)),max(0,int(y0-pad_y)),min(W,int(x1+pad_x)),min(H,int(y1+pad_y)))
        crop=im.crop(rect)
        crop=crop.resize((max(220,crop.width*3),max(100,crop.height*3)),Image.Resampling.LANCZOS)
        p=crop_dir/f"{idx:05d}_{key}.png";crop.save(p,"PNG",optimize=True)
        crops[key]=str(p)
    return crops

def render(idx,out_dir):
    rng=random.Random(934871+idx*7919)
    split="tune" if idx<4000 else "holdout"
    family=(idx%32) if split=="tune" else (32+(idx%8))
    vals=case_values(rng,idx)
    bg=rng.choice([(255,255,255),(250,250,247),(248,252,255),(255,250,246)])
    im=Image.new("RGB",(W,H),bg)
    d=ImageDraw.Draw(im)
    font=find_font(rng.choice([26,28,30,32]))
    small=find_font(22)
    title=find_font(40,True)
    header=find_font(24,True)
    field_boxes={}
    extra_boxes=[]

    company=rng.choice(["晨光科技股份有限公司","北辰精密有限公司","禾川物流股份有限公司","晴岳服務有限公司","遠景製造股份有限公司"])
    draw_text(d,(70,60),company,title)
    draw_text(d,(70,120),f"{2025+rng.randrange(0,2)} 年 {rng.randrange(1,13)} 月 薪資明細",header)
    draw_text(d,(70,165),f"員工：測試員 {idx:04d}    部門：{rng.choice(['製造','工程','客服','營運','行政'])}",small)

    # Structural families: tune 0-31, holdout 32-39 deliberately use unseen arrangements.
    earnings=[k for k in ["base","shiftAllowance","meal","performance","transport","otPay"] if vals[k]!=0]
    deductions=[k for k in ["dedLabor","dedHealth","dedWelfare","dedPension","dedAttendance","dedTax","dedHealthExtra"] if vals[k]!=0]
    comma=(family%4)!=3
    y0=250

    if family<8:
        # Classic two-column earnings/deductions.
        draw_text(d,(70,y0),"應發項目",header); draw_text(d,(620,y0),"應扣項目",header)
        yL=yR=y0+55
        for key in earnings:
            bb=add_row(d,label_for(rng,key),vals[key],85,535,yL,font,comma=comma)
            field_boxes[key]=bb;yL+=55
        for x in vals["extras"]:
            if x["kind"]=="income":
                bb=add_row(d,x["label"],x["amount"],85,535,yL,font,comma=comma);extra_boxes.append({**x,"bbox":bb});yL+=55
        for key in deductions:
            bb=add_row(d,label_for(rng,key),vals[key],635,1080,yR,font,comma=comma)
            field_boxes[key]=bb;yR+=55
        for x in vals["extras"]:
            if x["kind"]=="deduction":
                bb=add_row(d,x["label"],x["amount"],635,1080,yR,font,comma=comma);extra_boxes.append({**x,"bbox":bb});yR+=55

    elif family<16:
        # Labels on one line, values beneath: important for crop geometry.
        cols=[90,340,590,840]
        all_items=[(k,vals[k],"field") for k in earnings+deductions]
        all_items += [(x["label"],x["amount"],x["kind"]) for x in vals["extras"]]
        y=y0
        for start in range(0,len(all_items),4):
            batch=all_items[start:start+4]
            for j,(k,v,kind) in enumerate(batch):
                x=cols[j]; label=label_for(rng,k) if k in FIELD_ALIASES else k
                draw_text(d,(x,y),label,small)
                txt=money(v,comma);draw_text(d,(x,y+38),txt,font)
                bb=list(d.textbbox((x,y+38),txt,font=font))
                if k in FIELD_ALIASES: field_boxes[k]=bb
                else: extra_boxes.append({"label":k,"amount":v,"kind":kind,"bbox":bb})
            y+=115

    elif family<24:
        # Dense ledger.
        draw_text(d,(70,y0),"項目",header);draw_text(d,(500,y0),"類別",header);draw_text(d,(940,y0),"金額",header)
        y=y0+48
        rows=[(k,vals[k],"應發" if k in earnings else "應扣") for k in earnings+deductions]
        rows += [(x["label"],x["amount"],"應發" if x["kind"]=="income" else "應扣") for x in vals["extras"]]
        rng.shuffle(rows)
        for k,v,kind in rows:
            label=label_for(rng,k) if k in FIELD_ALIASES else k
            draw_text(d,(75,y),label,font);draw_text(d,(520,y),kind,small)
            txt=money(v,comma);draw_text(d,(1080,y),txt,font,anchor="ra")
            bb=list(d.textbbox((1080,y),txt,font=font,anchor="ra"))
            if k in FIELD_ALIASES: field_boxes[k]=bb
            else: extra_boxes.append({"label":k,"amount":v,"kind":"income" if kind=="應發" else "deduction","bbox":bb})
            y+=49

    elif family<32:
        # Four-column mini tables with subtle separators.
        d.rectangle((55,y0-20,1125,1200),outline=(170,170,170),width=2)
        xsets=[(75,245),(300,485),(545,730),(785,1080)]
        rows=[(k,vals[k]) for k in earnings+deductions]
        rows += [(x["label"],x["amount"]) for x in vals["extras"]]
        y=y0+20
        for i,(k,v) in enumerate(rows):
            c=i%4
            if c==0 and i>0:y+=72
            xl,xv=xsets[c];label=label_for(rng,k) if k in FIELD_ALIASES else k
            draw_text(d,(xl,y),label,small)
            txt=money(v,comma);draw_text(d,(xv,y+29),txt,font,anchor="ra")
            bb=list(d.textbbox((xv,y+29),txt,font=font,anchor="ra"))
            if k in FIELD_ALIASES: field_boxes[k]=bb
            else:
                kind=next((x["kind"] for x in vals["extras"] if x["label"]==k and x["amount"]==v),"income")
                extra_boxes.append({"label":k,"amount":v,"kind":kind,"bbox":bb})
    else:
        # Locked holdout families: reversed direction, boxed cards, alternating label/value order,
        # and a right-side net summary. These structures are not used in tune families.
        card_y=y0
        rows=[(k,vals[k],"income" if k in earnings else "deduction") for k in earnings+deductions]
        rows += [(x["label"],x["amount"],x["kind"]) for x in vals["extras"]]
        if family in (33,35,37,39): rows=list(reversed(rows))
        for i,(k,v,kind) in enumerate(rows):
            col=i%2;row=i//2;x=70+col*555;y=card_y+row*86
            d.rounded_rectangle((x,y,x+510,y+70),radius=10,outline=(185,185,185),width=2)
            label=label_for(rng,k) if k in FIELD_ALIASES else k
            if family%2==0:
                draw_text(d,(x+18,y+15),label,small);txt=money(v,comma);draw_text(d,(x+485,y+15),txt,font,anchor="ra")
                bb=list(d.textbbox((x+485,y+15),txt,font=font,anchor="ra"))
            else:
                txt=money(v,comma);draw_text(d,(x+18,y+15),txt,font);draw_text(d,(x+190,y+18),label,small)
                bb=list(d.textbbox((x+18,y+15),txt,font=font))
            if k in FIELD_ALIASES:field_boxes[k]=bb
            else:extra_boxes.append({"label":k,"amount":v,"kind":kind,"bbox":bb})

    # Net pay summary.
    net_y=1380 if family<32 else 1320
    d.line((70,net_y-25,1110,net_y-25),fill=(80,80,80),width=2)
    net_label=label_for(rng,"actualNet")
    draw_text(d,(70,net_y),net_label,header)
    net_txt=money(vals["actualNet"],comma)
    draw_text(d,(1080,net_y),net_txt,title,anchor="ra")
    field_boxes["actualNet"]=list(d.textbbox((1080,net_y),net_txt,font=title,anchor="ra"))

    # Document-level transformations.
    severity=idx%10
    if severity in (1,6): im=ImageEnhance.Contrast(im).enhance(.72)
    if severity in (2,7): im=ImageEnhance.Brightness(im).enhance(.80)
    if severity in (3,8): im=im.filter(ImageFilter.GaussianBlur(radius=0.65 if split=="tune" else 1.0))
    if severity==4:
        im=im.resize((885,1200),Image.Resampling.LANCZOS).resize((W,H),Image.Resampling.BICUBIC)
    if severity==5:
        # diagonal soft shadow
        ov=Image.new("L",(W,H),0);od=ImageDraw.Draw(ov);od.polygon([(0,0),(W*.45,0),(W*.18,H),(0,H)],fill=55)
        shade=Image.new("RGB",(W,H),(0,0,0));im=Image.composite(shade,im,ov.filter(ImageFilter.GaussianBlur(35)))
        im=ImageEnhance.Brightness(im).enhance(1.35)
    angle=rng.choice([0,0,0,-2,-1,1,2] if split=="tune" else [-3,-2,2,3,0])
    if angle:
        im=im.rotate(angle,Image.Resampling.BICUBIC,expand=False,fillcolor=bg)
        field_boxes={k:rotate_bbox(bb,angle) for k,bb in field_boxes.items()}
        for x in extra_boxes:x["bbox"]=rotate_bbox(x["bbox"],angle)

    critical_crops=save_critical_crops(im,field_boxes,out_dir,idx)
    path=out_dir/f"payslip_{idx:05d}.jpg"
    quality=rng.choice([72,78,84,90,94] if split=="tune" else [58,66,74,82,90])
    im.save(path,"JPEG",quality=quality,optimize=True)
    gt={k:v for k,v in vals.items() if k!="extras"}
    return {
      "id":idx,"split":split,"family":family,"image":str(path),
      "ground_truth":gt,"field_boxes":field_boxes,"extras":extra_boxes,"critical_crops":critical_crops,
      "quality":{"jpeg":quality,"angle":angle,"severity":severity}
    }

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--start",type=int,default=0)
    ap.add_argument("--count",type=int,default=1000)
    ap.add_argument("--out",required=True)
    args=ap.parse_args()
    out=Path(args.out);out.mkdir(parents=True,exist_ok=True)
    manifest=out/"manifest.jsonl"
    with manifest.open("w",encoding="utf-8") as fh:
        for idx in range(args.start,args.start+args.count):
            row=render(idx,out);fh.write(json.dumps(row,ensure_ascii=False)+"\n")
    print(json.dumps({"generated":args.count,"start":args.start,"manifest":str(manifest)},ensure_ascii=False))

if __name__=="__main__":
    main()
