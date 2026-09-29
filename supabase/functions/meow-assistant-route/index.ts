const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store"
};

const INTENTS = [
  "help","todayShift","tomorrowShift","nextWork","nextOff","monthSummary","overtimeHours",
  "grossPay","estimatedPay","holidayPay","missingOvertime","overtimePay","missingShiftAllowance",
  "shiftAllowance","deductions","payday","annualLeave","reconcileSummary","whyPayChanged","history",
  "unknownDeduction","extraItem","missingItem","rerunPayslip","salaryCalc","freeReconcile",
  "leaveConflict","paystubContents","sickLeavePay","rotationHelp","scheduleGeneral","payrollGeneral",
  "shiftRestInterval","consecutiveWorkDays","workBreak","splitShift","onCallStandby",
  "handoverWorkTime","crossMidnightShift","scheduleChange","shiftSwap","overtimeLimit",
  "compensatoryLeave","holidayTransfer","overtimeWageBase","annualLeaveTermination",
  "pregnancyNightShift","flexibleWorkingHours","article841","partTimeRights","naturalDisaster",
  "mandatoryOvertime","attendanceRecord","trainingMeetingTime","mealBreakOnDuty",
  "scheduleNotice","fixedShift","minimumWage","marriageLeave","familyCareLeave","sickLeaveRights",
  "annualLeaveRule","personalLeaveRule","unknown"
] as const;

const APP_DATA = [
  "schedule","attendance","overtime","leave","itinerary","todo","salary","payslip","settings","payday",
  "employment","entitlement","none"
] as const;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" }
  });
}

function serviceRoleKey() {
  const modern = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (modern) {
    try {
      const parsed = JSON.parse(modern);
      if (parsed && typeof parsed.default === "string") return parsed.default;
      if (parsed && typeof parsed === "object") {
        const first = Object.values(parsed).find((v) => typeof v === "string");
        if (typeof first === "string") return first;
      }
    } catch (_) {}
  }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
}

function userIdFromAuth(header: string | null) {
  if (!header) return "";
  const token = header.replace(/^Bearer\s+/i, "").trim();
  const part = token.split(".")[1];
  if (!part) return "";
  try {
    const normalized = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
    const payload = JSON.parse(atob(padded));
    return typeof payload.sub === "string" ? payload.sub : "";
  } catch (_) {
    return "";
  }
}

async function serverSelect(path: string) {
  const url = Deno.env.get("SUPABASE_URL") || "";
  const key = serviceRoleKey();
  if (!url || !key) throw new Error("SUPABASE_SERVER_CONFIG_MISSING");
  const res = await fetch(url + "/rest/v1/" + path, {
    headers: {
      "apikey": key,
      "Authorization": "Bearer " + key,
      "Accept": "application/json"
    },
    signal: AbortSignal.timeout(8_000)
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error("SUPABASE_REST_" + res.status);
  return data;
}

async function hasAssistantEntitlement(userId: string) {
  const dev = await serverSelect("app_developer_accounts?select=user_id&user_id=eq." + encodeURIComponent(userId) + "&limit=1");
  if (Array.isArray(dev) && dev.length) return { allowed: true, developer: true };

  const rows = await serverSelect("user_entitlements?select=plan,status,pro_until&user_id=eq." + encodeURIComponent(userId) + "&limit=1");
  const e = Array.isArray(rows) ? rows[0] : null;
  const active = e &&
    e.plan === "pro" &&
    ["active","trialing","grace_period"].includes(String(e.status || "")) &&
    e.pro_until &&
    Date.parse(String(e.pro_until)) > Date.now();
  return { allowed: !!active, developer: false };
}

function outputText(data: any) {
  if (typeof data?.output_text === "string" && data.output_text) return data.output_text;
  for (const item of Array.isArray(data?.output) ? data.output : []) {
    for (const part of Array.isArray(item?.content) ? item.content : []) {
      if (part?.type === "output_text" && typeof part.text === "string") return part.text;
    }
  }
  return "";
}

const nullableString = { anyOf: [{ type: "string" }, { type: "null" }] };

const schema = {
  type: "object",
  additionalProperties: false,
  required: [
    "understood","normalizedQuery","primaryIntent","secondaryIntents","userGoal","action",
    "appDataNeeded","missingInformation","shouldClarify","clarifyingQuestion","confidence",
    "risk","referencesPriorContext","contextResolution","facts","operation"
  ],
  properties: {
    understood: { type: "boolean" },
    normalizedQuery: { type: "string" },
    primaryIntent: { type: "string", enum: [...INTENTS] },
    secondaryIntents: {
      type: "array",
      items: { type: "string", enum: [...INTENTS] }
    },
    userGoal: { type: "string" },
    action: {
      type: "string",
      enum: ["answer","read_app_data","modify_app_data","navigate","clarify","hybrid"]
    },
    appDataNeeded: {
      type: "array",
      items: { type: "string", enum: [...APP_DATA] }
    },
    missingInformation: {
      type: "array",
      items: { type: "string" }
    },
    shouldClarify: { type: "boolean" },
    clarifyingQuestion: nullableString,
    confidence: { type: "number", minimum: 0, maximum: 1 },
    risk: {
      type: "string",
      enum: ["none","labor_rule","financial_calculation","sensitive_mutation"]
    },
    referencesPriorContext: { type: "boolean" },
    contextResolution: nullableString,
    facts: {
      type: "array",
      items: { type: "string" }
    },
    operation: {
      type: "object",
      additionalProperties: false,
      required: ["kind","dates","fromDate","toDate","hours","year","month","leaveType","leaveLabel","title","note","startTime","endTime","reminder"],
      properties: {
        kind: {
          type: "string",
          enum: ["none","add_overtime","remove_overtime","move_overtime","set_leave","remove_leave","add_event","remove_event","add_todo","remove_todo","view_schedule","undo_last"]
        },
        dates: {
          type: "array",
          items: { type: "string" }
        },
        fromDate: nullableString,
        toDate: nullableString,
        hours: { anyOf: [{ type: "number" }, { type: "null" }] },
        year: { anyOf: [{ type: "integer" }, { type: "null" }] },
        month: { anyOf: [{ type: "integer", minimum: 1, maximum: 12 }, { type: "null" }] },
        leaveType: { anyOf: [{ type: "string", enum: ["sick","menstrual","personal","annual","marriage","bereavement","occupationalInjury","official","maternity","miscarriage","pregnancyRest","prenatal","paternity","familyCare","parentalLeave","compensatory","custom"] }, { type: "null" }] },
        leaveLabel: nullableString,
        title: nullableString,
        note: nullableString,
        startTime: nullableString,
        endTime: nullableString,
        reminder: { anyOf: [{ type: "string", enum: ["none","1h","1d","3d"] }, { type: "null" }] }
      }
    }
  }
};

const intentGuide = [
  "shiftRestInterval=兩個班次之間休息時間／早跳晚／晚跳早／大夜接白班",
  "consecutiveWorkDays=連續上班很多天、多久沒休",
  "workBreak=單一工作日內的休息時間",
  "splitShift=兩頭班、兩段班、中空班",
  "onCallStandby=on call、待命、備勤、被叫回",
  "handoverWorkTime=交班、交接、提早到／延後走是否算工時",
  "crossMidnightShift=跨午夜班次歸屬",
  "scheduleChange=主管臨時改班",
  "shiftSwap=和同事換班",
  "overtimeLimit=月／三個月加班上限",
  "compensatoryLeave=加班換補休、補休到期",
  "holidayTransfer=國定假日調移",
  "overtimeWageBase=哪些固定工資／津貼要納入加班費計算基礎",
  "annualLeaveTermination=離職時未休特休",
  "pregnancyNightShift=懷孕／哺乳夜班",
  "flexibleWorkingHours=二週／八週／四週變形工時",
  "article841=勞基法84-1、保全等特殊工時",
  "partTimeRights=工讀、兼職、部分工時",
  "naturalDisaster=颱風、天然災害、停班停課",
  "mandatoryOvertime=被強迫／臨時要求加班、能否拒絕",
  "attendanceRecord=先打卡再工作、出勤紀錄不實",
  "trainingMeetingTime=教育訓練、晨會、下班會議是否工時",
  "mealBreakOnDuty=吃飯仍須待命／顧崗位是否算休息",
  "scheduleNotice=班表多久前公布／變更通知",
  "fixedShift=固定大夜／固定晚班與輪班的區別",
  "minimumWage=最低工資、基本工資、最低時薪、明年最低工資",
  "marriageLeave=婚假有幾天、婚假怎麼請、結婚可以請幾天",
  "familyCareLeave=家庭照顧假有幾天／幾小時、照顧家人、孩子臨時生病或預防接種",
  "sickLeaveRights=病假可以請幾天、病假全勤、請病假被懲處或考績影響",
  "annualLeaveRule=依法特休有幾天、年資對應特休日數；不是查個人剩餘餘額",
  "personalLeaveRule=事假依法幾天、事假怎麼請、事假有沒有薪水"
].join("\n");

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);

  const openaiKey = Deno.env.get("OPENAI_API_KEY") || "";
  if (!openaiKey) return json({ ok: false, code: "AI_NOT_CONFIGURED" }, 503);

  const userId = userIdFromAuth(req.headers.get("Authorization"));
  if (!userId) return json({ ok: false, code: "NOT_AUTHENTICATED" }, 401);

  let entitlement;
  try {
    entitlement = await hasAssistantEntitlement(userId);
  } catch (_) {
    return json({ ok: false, code: "ENTITLEMENT_CHECK_FAILED" }, 503);
  }
  if (!entitlement.allowed) return json({ ok: false, code: "PRO_REQUIRED" }, 403);

  let body: any;
  try {
    body = await req.json();
  } catch (_) {
    return json({ ok: false, code: "INVALID_JSON" }, 400);
  }

  const query = typeof body?.query === "string" ? body.query.trim().slice(0, 800) : "";
  if (!query) return json({ ok: false, code: "EMPTY_QUERY" }, 400);

  const recentContext = (Array.isArray(body?.context) ? body.context : [])
    .slice(-8)
    .map((x: any) => ({
      role: x?.role === "assistant" ? "assistant" : "user",
      text: String(x?.text || "").trim().slice(0, 600)
    }))
    .filter((x: any) => x.text);

  const appContext = body?.appContext && typeof body.appContext === "object"
    ? body.appContext
    : {};

  const instructions = [
    "你是《喵的，又要上班了》Pro 喵助理的『自然語言理解與路由器』。你不直接回答法律、不直接算薪資、不直接修改 App 資料。",
    "你的唯一工作是先理解使用者真正想做什麼，再輸出結構化意圖，交給後續規則、知識庫與 App 資料層。",
    "使用繁體中文理解台灣使用者口語。要能處理錯字、語音辨識錯字、台灣口語、英文縮寫、句子不完整、省略主詞、代名詞、前文承接及一句多意圖。",
    "不要只靠關鍵字。『有沒有夜班津貼』不是『夜班津貼沒有發』；『夜班津貼算不算加班基數』不是一般津貼查詢。",
    "若使用者說『那個』『那筆』『那天』『那九月呢』『第二筆也不是』，必須先看 context 判斷是否引用前文。",
    "若一句話同時包含多個需求，primaryIntent 放最主要需求，secondaryIntents 保留其他需求，不可只抓第一個關鍵字。",
    "若使用者明確說自己是工讀生、兼職或部分工時，並問國定假日、特休、病假或加班規則如何適用自己，primaryIntent 優先用 partTimeRights，具體議題放 secondaryIntents。",
    "若使用者明確強調固定大夜、固定晚班或不是輪班，並問換班間隔或輪班規則是否適用，primaryIntent 優先用 fixedShift，具體工時規則放 secondaryIntents。",
    "請明確區分『特休剩多少／還有幾天』與『依法我有幾天特休』：前者是 annualLeave，後者是 annualLeaveRule。",
    "婚假、家庭照顧假、病假權益、事假、最低工資屬會隨法規版本變動的問題，分別使用 marriageLeave、familyCareLeave、sickLeaveRights、personalLeaveRule、minimumWage；不要只丟到 payrollGeneral 或 scheduleGeneral。",
    "如果使用者問『最近新聞說婚假增加是真的嗎』『現在婚假到底幾天』，仍路由 marriageLeave；後續法規版本層會區分現行、已核定未生效、預告／草案。",
    "若 App 已可從班表／薪資／設定取得資料，appDataNeeded 要列出，不要把這些資料列成 missingInformation。",
    "只有真的缺少使用者沒有提供、App 也通常不會知道的必要條件才 shouldClarify=true。",
    "涉及勞動法適用、工時是否合法、84-1、變形工時、孕期夜班等，risk=labour_rule 對應的值必須是 labor_rule，且不要自行下法律結論。",
    "涉及薪資計算但需要實際班表／薪資資料時 risk=financial_calculation。",
    "涉及刪除、移動、覆蓋紀錄等資料變更時 risk=sensitive_mutation。",
    "如果只是情緒抱怨但同時包含可辨識需求，要理解需求，不要只把它當情緒。",
    "如果使用者明確要求 App 新增／取消／移動加班、登記／更改／取消任何假別、新增／取消行程、新增／取消待辦事項，或查看某月班表，operation 要輸出結構化操作；不要直接執行，只負責解析。",
    "假別修改要區分『詢問規則』與『修改班表』：例如『病假可以請幾天』是 sickLeaveRights；『9/28 幫我改病假』是 set_leave。『特休還剩多少』是 annualLeave；『9/29 我要請特休』是 set_leave。",
    "否定與糾正句必須優先處理語意範圍：『9/21 沒有請特休』『21號我沒請年假』『21號不是特休』『21號特休標錯了』都表示該日不應有該假別，operation.kind=remove_leave；不得因句中出現『請特休』字樣而判成 set_leave。",
    "雙重否定／否定取消不可反判：『21號沒有取消特休』『21號不是沒有請特休』不等於 remove_leave；如果語意仍不確定，kind=none 並 shouldClarify=true，絕對不要猜著修改資料。",
    "『不是 A，是 B』『日期講錯了，是另一日』屬糾正；只有能唯一解析原日期與新日期時才輸出對應操作，否則先追問，不得同時把兩個日期都設成假別。",
    "假別結構化對照：sick=普通傷病假／病假／傷病假；menstrual=生理假／月經假；personal=事假；annual=特休／年假／特別休假；marriage=婚假；bereavement=喪假；occupationalInjury=公傷病假／職災傷病假；official=公假；maternity=產假；miscarriage=流產假／小產假；pregnancyRest=安胎休養請假；prenatal=產檢假；paternity=陪產檢及陪產假／陪產假；familyCare=家庭照顧假；parentalLeave=育嬰留職停薪／育嬰留停／口語育嬰假；compensatory=補休。公司自訂的明確『XX假』可用 custom 並把原名稱放 leaveLabel。假別不明確時追問，不可猜。",
    "set_leave / remove_leave 的 dates 必須是可唯一確定的 YYYY-MM-DD；若使用者說今天、明天、後天、某月某日，要依 appContext.today 解析。使用者明確說『改成／請／登記／設成』時可 set_leave 覆蓋當天原有班表標記，實際覆蓋仍由 App 本機驗證與可復原機制控制。",
    "operation 的日期一律使用 YYYY-MM-DD。相對日期（今天、昨天、明天、禮拜五等）要以 appContext.today 與 recentContext 解析；不確定就 kind=none 並 shouldClarify=true。",
    "連續請假／育嬰留職停薪等若使用者給明確起訖日，可以把完整日期放 dates；若區間很長，也可填 fromDate/toDate 供 App 展開。缺起日或迄日就追問，不可自行補日期。",
    "新增行程使用 add_event：至少要有唯一日期與 title；時間可以省略。若有明確時間，startTime/endTime 使用 HH:MM；只有一個時間就填 startTime、endTime=null。取消行程使用 remove_event，必須用 title、dates 或兩者足以唯一辨識；不唯一就追問。",
    "不要要求使用者一定說『新增行程／新增待辦』。自然口語的未來／已發生安排本身就可代表操作：例如『我明天要帶貓咪去看醫生』『後天跟朋友吃飯』『10月3日回診』應解析為 add_event；『明天要繳電費』『後天記得買貓砂』『提醒我週五領包裹』應解析為 add_todo。是否有時間要忠於原句：沒說時間就保持 startTime/endTime=null，不可自行補時間。",
    "待辦不要求日期、時間或『待辦』關鍵字。『我要買衛生紙』『買牛奶』『幫我記一下回覆主管』『記得繳水電費』『晚點把衣服拿去曬』『領包裹』『續繳保費』『整理報稅資料』都可直接解析為 add_todo；沒有日期就 dates=[]，沒有時間就 startTime/endTime=null。已完成／過去敘述如『我剛剛買了牛奶』『昨天已經繳電費了』不是新增待辦，除非使用者明確要求再次提醒。",
    "新增待辦使用 add_todo：title 必填，日期與時間可省略；取消待辦使用 remove_todo，必須用 title、dates 或兩者足以唯一辨識。使用者說『代辦』也視為『待辦』。",
    "行程／待辦也必須正確處理否定取消：『不要取消明天的回診行程』『不用刪掉繳費待辦』『那個行程先不要移除』都不是 remove_event/remove_todo，operation.kind 必須是 none；若語意仍不確定就 shouldClarify=true，絕對不可因為看到『取消／刪除』就執行刪除。",
    "行程／待辦的更正句如『不是明天，是後天的回診』『不是繳費，是繳電話費』若無法用 recentContext 唯一決定要修改哪一筆，operation.kind=none 並追問；不能把兩筆都新增或刪除。",
    "提醒只有使用者明確說前1小時／前1天／前3天時才設定 reminder=1h／1d／3d；沒有提提醒就 reminder=none，不可自行開通知。",

    "承接前文的操作，例如『那個拿掉』『不是22，是24』『移到禮拜五』，只有在 recentContext 能唯一解析對象時才輸出 operation，並 referencesPriorContext=true、contextResolution 說明解析結果。",
    "新增／取消／移動資料屬 sensitive_mutation。若日期或對象無法唯一確定，不可猜測。",
    "查看班表使用 view_schedule，year/month 必須解析完成；修改加班使用 add_overtime、remove_overtime、move_overtime；修改假別使用 set_leave、remove_leave；行程使用 add_event、remove_event；待辦使用 add_todo、remove_todo。",
    "如果使用者明確表示『撤回剛才』『復原上一個動作』『剛剛那個不要了』『取消剛才那一步』，且 recentContext 顯示上一個動作是 App 修改，operation.kind=undo_last；若無法確認上一個動作，不可猜測。",
    "意圖對照：\n" + intentGuide
  ].join("\n");

  const userPayload = {
    query,
    recentContext,
    appContext
  };

  const requestBody = {
    model: "gpt-5.6",
    store: false,
    reasoning: { effort: "low" },
    max_output_tokens: 1200,
    instructions,
    input: [{
      role: "user",
      content: [{
        type: "input_text",
        text: "請只做自然語言理解與路由。輸入如下：\n" + JSON.stringify(userPayload)
      }]
    }],
    text: {
      format: {
        type: "json_schema",
        name: "meow_assistant_nlu_route",
        strict: true,
        schema
      }
    }
  };

  let provider: any = null;
  try {
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + openaiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(25_000)
    });
    provider = await res.json().catch(() => null);

    if (!res.ok) {
      console.warn("meow-assistant-route upstream rejected request", {
        status: res.status,
        code: String(provider?.error?.code || ""),
        type: String(provider?.error?.type || "")
      });
      return json({
        ok: false,
        code: "ROUTING_REQUEST_FAILED",
        provider_status: res.status,
        provider_code: String(provider?.error?.code || "")
      }, 502);
    }

    const text = outputText(provider);
    let route: any;
    try {
      route = JSON.parse(text);
    } catch (_) {
      return json({ ok: false, code: "ROUTING_OUTPUT_INVALID" }, 502);
    }

    return json({
      ok: true,
      model: provider?.model || "gpt-5.6",
      route,
      usage: {
        input_tokens: Number(provider?.usage?.input_tokens || 0),
        output_tokens: Number(provider?.usage?.output_tokens || 0)
      }
    });
  } catch (_) {
    return json({ ok: false, code: "ROUTING_UNAVAILABLE" }, 502);
  }
});
