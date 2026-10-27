import {
  createRoom,
  addUserToRoom,
  removeUserFromRoom,
  castVoteInRoom,
  revealVotesInRoom,
  resetVotesInRoom,
  sanitizeRoomState,
} from '../src/utils/roomEngine.ts';

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

console.log('--- ALL ROOM ENGINE TESTS PASSED! ---');
