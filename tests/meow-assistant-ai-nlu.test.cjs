const fs=require('fs');
const assert=require('assert');

const html=fs.readFileSync('index.html','utf8');
const edge=fs.readFileSync('supabase/functions/meow-assistant-route/index.ts','utf8');

const build=(html.match(/<meta name="meow-ui-build" content="v(\d+)[^"]*">/)||[])[1];
assert(Number(build)>=203,'OpenAI NLU build marker must be v203+');

assert(html.includes("routeMeowAssistantWithAI"),'AI route helper missing');
assert(html.includes("invokeUserFunction('meow-assistant-route'"),'protected AI route invocation missing');
assert(html.includes('meowAssistantConversation'),'conversation context buffer missing');
assert(html.includes('priorContext=meowAssistantConversation.slice(-8)'),'prior context handoff missing');
assert(html.includes("['scheduleGeneral','payrollGeneral'].includes"),'generic local fallback detection missing');
assert(html.includes("if(!parsed.ok||genericKnowledge)"),'AI fallback gate missing');
assert(html.includes("if(aiRoute)"),'AI route application missing');
assert(html.includes("handleMeowAssistantAiRoute"),'AI route handler missing');
assert(html.includes("MEOW_ASSISTANT_AI_LEGACY_INTENTS"),'legacy intent bridge missing');

const parsePos=html.indexOf("const parsed=meowAssistantPlanCheck(meowAssistantParse(raw))");
const aiPos=html.indexOf("const aiRoute=await routeMeowAssistantWithAI(raw,priorContext)");
assert(parsePos>=0&&aiPos>parsePos,'local deterministic parser must run before OpenAI fallback');

assert(edge.includes('OPENAI_API_KEY'),'server-side OpenAI secret lookup missing');
assert(edge.includes('https://api.openai.com/v1/responses'),'Responses API route missing');
assert(edge.includes('type: "json_schema"'),'Structured Outputs JSON schema missing');
assert(edge.includes('strict: true'),'Structured Outputs strict mode missing');
assert(edge.includes('hasAssistantEntitlement'),'Pro/developer entitlement check missing');
assert(edge.includes('"PRO_REQUIRED"'),'Pro enforcement response missing');
assert(edge.includes('recentContext'),'context input missing');
assert(edge.includes('referencesPriorContext'),'context-resolution output missing');
assert(edge.includes('secondaryIntents'),'multi-intent output missing');
assert(edge.includes('shiftRestInterval'),'shift-rest intent missing');
assert(edge.includes('article841'),'84-1 intent missing');
assert(edge.includes('overtimeWageBase'),'overtime wage-base intent missing');
assert(edge.includes('pregnancyNightShift'),'pregnancy/night intent missing');
assert(edge.includes('naturalDisaster'),'natural-disaster intent missing');
assert(edge.includes('"set_leave"'),'leave set operation missing');
assert(edge.includes('"remove_leave"'),'leave remove operation missing');
assert(edge.includes('leaveType'),'leave type structured field missing');
assert(edge.includes('"add_event"') && edge.includes('"remove_event"'),'itinerary operation kinds missing');
assert(edge.includes('"add_todo"') && edge.includes('"remove_todo"'),'todo operation kinds missing');
assert(edge.includes('"parentalLeave"'),'parental leave structured type missing');
assert(edge.includes('"familyCare"'),'family-care leave structured type missing');
assert(edge.includes('"maternity"') && edge.includes('"prenatal"') && edge.includes('"paternity"'),'gender-equality leave structured types missing');
assert(edge.includes('"marriage"') && edge.includes('"bereavement"') && edge.includes('"occupationalInjury"') && edge.includes('"official"'),'labor-leave structured types missing');
assert(edge.includes('leaveLabel'),'custom leave label field missing');
assert(edge.includes('startTime') && edge.includes('endTime') && edge.includes('reminder'),'itinerary/todo time fields missing');
assert(html.includes("plan.type==='addEvent'") && html.includes("plan.type==='removeEvent'"),'local itinerary execution bridge missing');
assert(html.includes("plan.type==='addTodo'") && html.includes("plan.type==='removeTodo'"),'local todo execution bridge missing');
assert(!/sk-[A-Za-z0-9_-]{12,}/.test(edge),'OpenAI secret must never be committed');

console.log('PASS Meow Assistant OpenAI NLU integration contract');
