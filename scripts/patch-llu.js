'use strict';
var fs = require('fs');
var path = require('path');

var librelinkupPath = path.join(__dirname, '../node_modules/nightscout-connect/lib/sources/librelinkup.js');

try {
  var src = fs.readFileSync(librelinkupPath, 'utf8');

  if (src.includes('LLU_PATCHED')) {
    console.log('LLU: already patched, skipping');
    process.exit(0);
  }

  var patched = src;

  // Fix 1: Add Account-Id to sessionFromAuth connections request
  var fix1before = "var token = auth.data.authTicket.token;\n      var headers = {\n        'Authorization': [ 'Bearer', token ].join(' ')\n      };";
  var fix1after  = "var token = auth.data.authTicket.token;\n      var userId = (auth.data.user || {}).id || '';\n      var accountId = require('crypto').createHash('sha256').update(userId).digest('hex');\n      var headers = {\n        'Authorization': [ 'Bearer', token ].join(' '),\n        'Account-Id': accountId\n      };";
  if (patched.includes(fix1before)) { patched = patched.replace(fix1before, fix1after); console.log('LLU: Fix 1 OK'); }
  else { console.warn('LLU: Fix 1 SKIPPED - string not found'); }

  // Fix 4a: Store accountId in session object
  var fix4abefore = "var result = connections[0];\n        result.authTicket = auth.data.authTicket;";
  var fix4aafter  = "var result = connections[0];\n        result.authTicket = auth.data.authTicket;\n        result._accountId = accountId;";
  if (patched.includes(fix4abefore)) { patched = patched.replace(fix4abefore, fix4aafter); console.log('LLU: Fix 4a OK'); }
  else { console.warn('LLU: Fix 4a SKIPPED - string not found'); }

  // Fix 4b: Add Account-Id to graph request (template literal - use indexOf/slice)
  var fix4bBefore = "var token = session.authTicket.token;\n      var headers = {\n        'Authorization': `Bearer ${token}`\n      };";
  var fix4bAfter  = "var token = session.authTicket.token;\n      var headers = {\n        'Authorization': `Bearer ${token}`,\n        'Account-Id': session._accountId || ''\n      };";
  if (patched.includes(fix4bBefore)) { patched = patched.replace(fix4bBefore, fix4bAfter); console.log('LLU: Fix 4b OK'); }
  else { console.warn('LLU: Fix 4b SKIPPED - string not found'); }

  // Fix 2: Null-safe last_known
  var fix2before = 'var last_updated = last_known.entries;';
  var fix2after  = 'var last_updated = last_known ? last_known.entries : null;';
  if (patched.includes(fix2before)) { patched = patched.replace(fix2before, fix2after); console.log('LLU: Fix 2 OK'); }
  else { console.warn('LLU: Fix 2 SKIPPED - string not found'); }

  // Fix 3: Null-safe graphData
  var fix3before = 'var entries = batch.graphData.map(to_ns_sgv).filter(is_newer);';
  var fix3after  = 'var entries = (batch.graphData || []).map(to_ns_sgv).filter(is_newer);';
  if (patched.includes(fix3before)) { patched = patched.replace(fix3before, fix3after); console.log('LLU: Fix 3 OK'); }
  else { console.warn('LLU: Fix 3 SKIPPED - string not found'); }

  patched = '// LLU_PATCHED\n' + patched;
  fs.writeFileSync(librelinkupPath, patched);
  console.log('LLU: All patches written to disk successfully');

} catch(e) {
  console.error('LLU: Patch script failed:', e.message);
}
