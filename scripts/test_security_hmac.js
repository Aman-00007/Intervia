import crypto from "crypto";

function sha256(data) {
  return crypto.createHash("sha256").update(data).digest("hex");
}

class HmacChainLoggerTest {
  constructor(seedKey = "INTERVIA_SERVER_SEED_IV-2048") {
    this.seedKey = seedKey;
    this.entries = [];
  }

  append(eventType, payload) {
    const sequenceId = this.entries.length + 1;
    const timestamp = new Date().toISOString();
    const payloadStr = typeof payload === "string" ? payload : JSON.stringify(payload);
    const previousHash = this.entries.length === 0 
      ? sha256(this.seedKey) 
      : this.entries[this.entries.length - 1].currentHash;

    const signatureData = `${previousHash}:${sequenceId}:${timestamp}:${eventType}:${payloadStr}`;
    const currentHash = sha256(`${this.seedKey}:${signatureData}`);

    const entry = {
      sequenceId,
      eventType,
      payload: payloadStr,
      timestamp,
      previousHash,
      currentHash,
    };

    this.entries.push(entry);
    return entry;
  }

  static verifyChain(entries, seedKey = "INTERVIA_SERVER_SEED_IV-2048") {
    if (!entries || entries.length === 0) {
      return { valid: true, message: "Empty log is valid" };
    }

    let expectedPrevHash = sha256(seedKey);

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const expectedSeq = i + 1;

      // 1. Check sequence ordering
      if (entry.sequenceId !== expectedSeq) {
        return {
          valid: false,
          brokenAt: i,
          reason: `Sequence violation: expected ${expectedSeq}, got ${entry.sequenceId}`,
        };
      }

      // 2. Check previous hash linkage
      if (entry.previousHash !== expectedPrevHash) {
        return {
          valid: false,
          brokenAt: i,
          reason: `Broken chain link at entry #${entry.sequenceId}: previousHash mismatch`,
        };
      }

      // 3. Re-calculate cryptographic signature
      const signatureData = `${entry.previousHash}:${entry.sequenceId}:${entry.timestamp}:${entry.eventType}:${entry.payload}`;
      const recalculatedHash = sha256(`${seedKey}:${signatureData}`);

      if (entry.currentHash !== recalculatedHash) {
        return {
          valid: false,
          brokenAt: i,
          reason: `Tampered entry #${entry.sequenceId}: signature does not match payload`,
        };
      }

      expectedPrevHash = entry.currentHash;
    }

    return { valid: true, message: `All ${entries.length} log entries verified cryptographically.` };
  }
}

// ==========================================
// SECURITY PENETRATION & TAMPER TESTS
// ==========================================

console.log("=== RUNNING ANTI-CHEAT SECURITY VERIFICATION TESTS ===");

const logger = new HmacChainLoggerTest();
logger.append("SESSION_START", { candidateId: "C-7K2", room: "IV-2048" });
logger.append("FULLSCREEN_ENTER", { status: "locked" });
logger.append("TAB_SWITCH", { durationSec: 4.2, attempt: 1 });
logger.append("CODE_EXECUTE", { language: "python", runNumber: 1 });
logger.append("TAB_SWITCH", { durationSec: 1.8, attempt: 2 });
logger.append("PASTE_INTERCEPT", { charactersBlocked: 142 });

// Test 1: Untampered log verification
const initialCheck = HmacChainLoggerTest.verifyChain(logger.entries);
console.log("Test 1 - Valid Chain:", initialCheck.valid ? "PASSED ✅" : "FAILED ❌", initialCheck.message);

// Test 2: Attacker tries to modify payload (e.g. erase tab switch details)
const tamperedEntries1 = JSON.parse(JSON.stringify(logger.entries));
tamperedEntries1[2].payload = JSON.stringify({ durationSec: 0, attempt: 0 });
const test2 = HmacChainLoggerTest.verifyChain(tamperedEntries1);
console.log("Test 2 - Detect Payload Modification:", !test2.valid ? "PASSED ✅ (Caught: " + test2.reason + ")" : "FAILED ❌");

// Test 3: Attacker tries to delete a tab switch violation entry
const tamperedEntries2 = JSON.parse(JSON.stringify(logger.entries));
tamperedEntries2.splice(2, 1); // remove entry #3
const test3 = HmacChainLoggerTest.verifyChain(tamperedEntries2);
console.log("Test 3 - Detect Entry Deletion:", !test3.valid ? "PASSED ✅ (Caught: " + test3.reason + ")" : "FAILED ❌");

// Test 4: Attacker tries to modify timestamp
const tamperedEntries3 = JSON.parse(JSON.stringify(logger.entries));
tamperedEntries3[4].timestamp = "2026-01-01T00:00:00.000Z";
const test4 = HmacChainLoggerTest.verifyChain(tamperedEntries3);
console.log("Test 4 - Detect Timestamp Modification:", !test4.valid ? "PASSED ✅ (Caught: " + test4.reason + ")" : "FAILED ❌");

// Test 5: Attacker tries to reorder events
const tamperedEntries4 = JSON.parse(JSON.stringify(logger.entries));
const temp = tamperedEntries4[1];
tamperedEntries4[1] = tamperedEntries4[3];
tamperedEntries4[3] = temp;
const test5 = HmacChainLoggerTest.verifyChain(tamperedEntries4);
console.log("Test 5 - Detect Event Reordering:", !test5.valid ? "PASSED ✅ (Caught: " + test5.reason + ")" : "FAILED ❌");

if (initialCheck.valid && !test2.valid && !test3.valid && !test4.valid && !test5.valid) {
  console.log("\n>>> ALL 5 SECURITY VERIFICATION TESTS PASSED SUCCESSFULLY! <<<");
} else {
  console.error("\n>>> SECURITY TESTS FAILED! <<<");
  process.exit(1);
}

