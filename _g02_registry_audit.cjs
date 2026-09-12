

{ initializeRegistry, getAllCommands } from "./backend/services/ai/commandRegistry/index.mjs";
initializeRegistry();
const all = getAllCommands();
const MUT = new Set(["POST","PUT","PATCH","DELETE","FRONTEND_DISPATCH"]);
const mut = all.filter(c => MUT.has(c.method));
console.log("total commands:", all.length, "mutators:", mut.length);
// types that mention inverse-ish verbs
const allTypes = new Set(all.map(c => c.type));
const invLike = [...allTypes].filter(t => /unlock|unblock|demote|activate|reactivate|restore|revert|unassign|undo/.test(t));
console.log("inverse-like types present:", invLike.join(",") || "(none)");
// dump mutator list with destructive flags + clientRef
const rows = mut.map(c => ({ t: c.type, m: c.method, d: c.destructive, rc: !!c.requiresClientRef, inv: c.inverseCommand || null }));
console.log(JSON.stringify(rows, null, 0));
