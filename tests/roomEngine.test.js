import {
  createRoom,
  hydrateRoomFromState,
  addUserToRoom,
  removeUserFromRoom,
  castVoteInRoom,
  revealVotesInRoom,
  resetVotesInRoom,
  changeNameInRoom,
  sanitizeRoomState,
} from '../src/utils/roomEngine.ts';
import { escapeMarkdownCell } from '../src/utils/validation.ts';

console.log('--- Testing Room Engine & State Synchronization ---');

// 1. Create Room
const room = createRoom('sprint-42', 'Sprint 42 Planning', 'modified-fibonacci');
if (room.id !== 'sprint-42') throw new Error('Room ID mismatch');

// 2. Add Users (Alice and Bob)
addUserToRoom(room, {
  socketId: 'user-1',
  name: 'Alice',
  avatarColor: '#ec4899',
  isSpectator: false,
});
addUserToRoom(room, {
  socketId: 'user-2',
  name: 'Bob',
  avatarColor: '#3b82f6',
  isSpectator: false,
});

if (room.users.size !== 2) throw new Error('Expected 2 users');
if (room.hostSocketId !== 'user-1') throw new Error('Expected Alice (user-1) to be host');

// 3. Alice votes '5', Bob has not voted yet
castVoteInRoom(room, 'user-1', '5');

// Check sanitized state for Bob
const bobView1 = sanitizeRoomState(room, 'user-2');
const aliceInBobView1 = bobView1.participants.find((p) => p.id === 'user-1');
const bobInBobView1 = bobView1.participants.find((p) => p.id === 'user-2');

if (!aliceInBobView1.hasVoted) throw new Error('Alice should be marked as hasVoted');
if (aliceInBobView1.vote !== null) throw new Error('Alice vote should be SECRET to Bob before reveal');
if (bobInBobView1.hasVoted) throw new Error('Bob has not voted yet');

// Check sanitized state for Alice (Alice should see her own vote)
const aliceView1 = sanitizeRoomState(room, 'user-1');
const aliceInAliceView1 = aliceView1.participants.find((p) => p.id === 'user-1');
if (aliceInAliceView1.vote !== '5') throw new Error('Alice should see her own vote');

console.log('✓ Secret voting & state sanitization verified');

// 4. Bob votes '5'
castVoteInRoom(room, 'user-2', '5');

// 5. Reveal Votes
const record = revealVotesInRoom(room);
if (!record) throw new Error('Expected history record');
if (record.average !== 5) throw new Error(`Expected average 5, got ${record.average}`);
if (record.agreementPercentage !== 100) throw new Error(`Expected agreement 100%, got ${record.agreementPercentage}%`);

const bobViewRevealed = sanitizeRoomState(room, 'user-2');
const aliceRevealed = bobViewRevealed.participants.find((p) => p.id === 'user-1');
const bobRevealed = bobViewRevealed.participants.find((p) => p.id === 'user-2');

if (aliceRevealed.vote !== '5' || bobRevealed.vote !== '5') {
  throw new Error('Votes should now be revealed to all participants');
}
console.log('✓ Reveal votes & consensus calculation verified (100% agreement)');

// 6. Reset round
resetVotesInRoom(room);
const viewAfterReset = sanitizeRoomState(room, 'user-1');
if (viewAfterReset.isRevealed) throw new Error('Expected isRevealed to be false after reset');
if (viewAfterReset.participants.some((p) => p.hasVoted || p.vote !== null)) {
  throw new Error('Expected all votes to be cleared');
}
console.log('✓ Reset round verified');

// 7. Host migration on leave
removeUserFromRoom(room, 'user-1');
if (room.hostSocketId !== 'user-2') throw new Error('Expected host to migrate to Bob (user-2)');
console.log('✓ Host migration verified');

// 8. Anti-duplication on page reload / re-join
// Bob casts a vote '8'
castVoteInRoom(room, 'user-2', '8');

// Bob reloads page: connects with new socketId 'user-2-reloaded', same name 'Bob'
addUserToRoom(room, {
  socketId: 'user-2-reloaded',
  userId: 'usr-bob-123',
  name: 'Bob',
  avatarColor: '#3b82f6',
  isSpectator: false,
});

const bobReloadedView = sanitizeRoomState(room, 'user-2-reloaded');
if (bobReloadedView.participants.length !== 1) {
  throw new Error(`Expected exactly 1 participant after Bob reloaded, got ${bobReloadedView.participants.length}`);
}
const singleBob = bobReloadedView.participants[0];
if (singleBob.name !== 'Bob') throw new Error(`Expected participant to be Bob, got ${singleBob.name}`);
if (singleBob.id !== 'user-2-reloaded') throw new Error('Expected socket ID to be updated to new socket');
if (singleBob.vote !== '8') throw new Error(`Expected vote '8' to be preserved across reload, got ${singleBob.vote}`);
console.log('✓ Anti-duplication & vote preservation on reload verified');

// 9. Guest joins shared room and votes - guest view must show vote to guest, secret to host
const sharedRoom = createRoom('shared-sprint', 'Sprint Planning', 'modified-fibonacci');
addUserToRoom(sharedRoom, {
  socketId: 'host-socket-1',
  name: 'Host Alice',
  avatarColor: '#ec4899',
  isSpectator: false,
});
// Guest joins via shared link
addUserToRoom(sharedRoom, {
  socketId: 'guest-socket-2',
  userId: 'usr-guest-2',
  name: 'Guest Bob',
  avatarColor: '#3b82f6',
  isSpectator: false,
});
// Guest votes '13'
castVoteInRoom(sharedRoom, 'guest-socket-2', '13');

// Check guest's view: guest MUST be able to see their own vote '13'!
const guestView = sanitizeRoomState(sharedRoom, 'guest-socket-2');
const guestSelf = guestView.participants.find((p) => p.id === 'guest-socket-2');
if (!guestSelf.hasVoted) throw new Error('Guest should have hasVoted=true');
if (guestSelf.vote !== '13') throw new Error(`Guest should see their own vote '13', got: ${guestSelf.vote}`);

// Check host's view: host should know guest voted, but vote value must be hidden (null)
const hostView = sanitizeRoomState(sharedRoom, 'host-socket-1');
const guestInHostView = hostView.participants.find((p) => p.id === 'guest-socket-2');
if (!guestInHostView.hasVoted) throw new Error('Host should see guest hasVoted=true');
if (guestInHostView.vote !== null) throw new Error(`Guest vote should be hidden from host before reveal, got: ${guestInHostView.vote}`);
console.log('✓ Guest vote visibility to self and secrecy to host verified');

// 10. Hydrate room from state on P2P host migration & avatarColor update
sharedRoom.storyTitle = 'US-999: Migración de Host P2P';
revealVotesInRoom(sharedRoom);
const snapshotBeforeMigration = sanitizeRoomState(sharedRoom, 'guest-socket-2');

const hydratedRoom = hydrateRoomFromState(snapshotBeforeMigration, 'guest-socket-2');
if (hydratedRoom.storyTitle !== 'US-999: Migración de Host P2P') {
  throw new Error('Expected storyTitle to be preserved after host hydration');
}
if (hydratedRoom.history.length !== 1) {
  throw new Error('Expected history to be preserved after host hydration');
}
changeNameInRoom(hydratedRoom, 'guest-socket-2', 'Bob Nuevo Host', '#10b981');
const updatedHost = hydratedRoom.users.get('guest-socket-2');
if (updatedHost?.name !== 'Bob Nuevo Host' || updatedHost?.avatarColor !== '#10b981') {
  throw new Error('Expected changeNameInRoom to update both name and avatarColor');
}
console.log('✓ P2P host state hydration & profile color update verified');

// 11. Security: Prevent Host/Identity hijacking when two distinct users share the same name
const secRoom = createRoom('sec-room', 'Security Room', 'modified-fibonacci');
addUserToRoom(secRoom, {
  socketId: 'socket-carlos-1',
  userId: 'usr_carlos_original',
  name: 'Carlos',
  avatarColor: '#3b82f6',
  isSpectator: false,
});
castVoteInRoom(secRoom, 'socket-carlos-1', '13');

// A second person also named "Carlos" (with a different userId) joins the room
addUserToRoom(secRoom, {
  socketId: 'socket-carlos-2',
  userId: 'usr_carlos_second',
  name: 'Carlos',
  avatarColor: 'red; background:url(evil)', // CSS injection attempt
  isSpectator: false,
});

const secView = sanitizeRoomState(secRoom, 'socket-carlos-1');
if (secView.participants.length !== 2) {
  throw new Error(`Expected both Carlos users to coexist (2 participants), got ${secView.participants.length}`);
}
if (secRoom.hostSocketId !== 'socket-carlos-1') {
  throw new Error('Host role must NOT be hijacked by another user with the same name');
}
const carlos1 = secView.participants.find((p) => p.id === 'socket-carlos-1');
const carlos2 = secView.participants.find((p) => p.id === 'socket-carlos-2');
if (carlos1?.vote !== '13') {
  throw new Error('Original Carlos vote must not be overwritten');
}
if (carlos2?.avatarColor !== '#6366f1') {
  throw new Error(`Expected invalid avatarColor to be sanitized to #6366f1, got ${carlos2?.avatarColor}`);
}

// 12. Security: Reject invalid votes not in the active deck
const invalidVoteAccepted = castVoteInRoom(secRoom, 'socket-carlos-2', '9999');
if (invalidVoteAccepted) {
  throw new Error('Expected invalid card vote "9999" to be rejected');
}

// 13. Security: Escape Markdown table injection characters
const escapedMd = escapeMarkdownCell('US-10 | Inyección\nNueva línea');
if (escapedMd !== 'US-10 \\| Inyección Nueva línea') {
  throw new Error(`Unexpected escaped markdown cell: ${escapedMd}`);
}
console.log('✓ Security checks (anti-hijacking, vote validation, color sanitization, Markdown escaping) verified');

console.log('--- ALL ROOM ENGINE TESTS PASSED! ---');
