const ROUND_ID = /^r([0-9]+)$/;

function parseRoundId(value) {
  const match = ROUND_ID.exec(value);
  return match ? Number(match[1]) : NaN;
}

function expectedWindow(annexRounds) {
  if (!Array.isArray(annexRounds) || annexRounds.length < 2) return null;
  const numbers = annexRounds.map(parseRoundId);
  if (numbers.some((number) => !Number.isSafeInteger(number))) return null;
  for (let index = 1; index < numbers.length; index += 1) {
    if (numbers[index] !== numbers[index - 1] + 1) return null;
  }
  const archivedThrough = numbers.at(-1);
  return {
    archivedThrough,
    live: [archivedThrough + 1, archivedThrough + 2],
    nextRound: archivedThrough + 3,
  };
}

function roundToken(number) {
  return `r${number}`;
}

export function validateLiveWindowNarration(packetText, annexRounds) {
  if (typeof packetText !== 'string') return 'packet text is not a string';
  const expected = expectedWindow(annexRounds);
  if (!expected) return 'annex round list is not a contiguous numeric sequence';

  const [firstLive, secondLive] = expected.live.map(roundToken);
  const archivedThrough = roundToken(expected.archivedThrough);
  const nextRound = roundToken(expected.nextRound);
  const evidencePattern = new RegExp(
    `Current evidence of record is the ordered annex plus the live ${firstLive} and ${secondLive} active-builder records and their provider receipts; ${archivedThrough} is annexed in the current verified annex`,
  );
  if (!evidencePattern.test(packetText)) {
    return `live-window evidence-of-record pair does not equal ${firstLive}/${secondLive}`;
  }
  if (!packetText.includes(`the live summary retains only ${firstLive} and ${secondLive}`)) {
    return `live-window compact summary does not equal ${firstLive}/${secondLive}`;
  }
  if (!packetText.includes(`preserved rounds r89-r${expected.archivedThrough};`)) {
    return `annex coverage does not end at ${archivedThrough}`;
  }

  const retainedStart = packetText.indexOf('Retained live summaries are ');
  if (retainedStart < 0) return 'retained live summary sentence is missing';
  const retainedEnd = packetText.indexOf(`. ${archivedThrough} is annexed before ${nextRound};`, retainedStart);
  if (retainedEnd < 0) return 'retained live summary boundary sentence is missing';
  const retainedSentence = packetText.slice(retainedStart, retainedEnd);
  const retainedRounds = [...retainedSentence.matchAll(/\br([0-9]+)=(?:REVISE|CLEAN|VOID|UNADJUDICATED)\b/g)]
    .map((match) => Number(match[1]));
  if (retainedRounds.length !== 2 || retainedRounds.some((round, index) => round !== expected.live[index])) {
    return `retained live summary round set does not equal ${firstLive}/${secondLive}`;
  }
  if (!packetText.includes(`${firstLive} and ${secondLive} are the retained live summaries`)) {
    return `retained live summary closing pair does not equal ${firstLive}/${secondLive}`;
  }
  return null;
}
