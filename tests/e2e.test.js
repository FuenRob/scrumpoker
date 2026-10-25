import { io } from 'socket.io-client';

async function testPokerFlow() {
  console.log('--- Testing Scrum Poker Real-Time WebSocket Flow ---');
  const serverUrl = 'http://localhost:3001';

  const socket1 = io(serverUrl);
  const socket2 = io(serverUrl);

  await new Promise((resolve) => socket1.on('connect', resolve));
  await new Promise((resolve) => socket2.on('connect', resolve));
  console.log('✓ Both sockets connected');

  const roomId = 'room-test-123';

  // Join room
  socket1.emit('join_room', { roomId, roomName: 'Test Room', name: 'Alice', isSpectator: false });
  socket2.emit('join_room', { roomId, roomName: 'Test Room', name: 'Bob', isSpectator: false });

  // Wait for Bob to receive room state
  const stateAfterJoin = await new Promise((resolve) => {
    socket2.on('room_state', (state) => {
      if (state.participants.length === 2) resolve(state);
    });
  });
  console.log('✓ Both participants joined room:', stateAfterJoin.participants.map(p => p.name));

  // Alice votes "🦀" (Crab Easter Egg)
  socket1.emit('cast_vote', { vote: '🦀' });

  // Bob verifies Alice hasVoted: true, but Alice's vote is NULL to Bob (hidden!)
  const stateHidden = await new Promise((resolve) => {
    const handler = (state) => {
      const alice = state.participants.find(p => p.name === 'Alice');
      if (alice && alice.hasVoted) {
        socket2.off('room_state', handler);
        resolve(state);
      }
    };
    socket2.on('room_state', handler);
  });
  const aliceToBob = stateHidden.participants.find(p => p.name === 'Alice');
  console.log(`✓ Alice vote status seen by Bob: hasVoted=${aliceToBob.hasVoted}, vote=${aliceToBob.vote} (Secret!)`);
  if (aliceToBob.vote !== null) {
    throw new Error('Security flaw: Vote was not hidden before reveal!');
  }

  // Bob votes "5"
  socket2.emit('cast_vote', { vote: '5' });

  // Alice reveals votes
  socket1.emit('reveal_votes');

  // Both should receive revealed votes
  const stateRevealed = await new Promise((resolve) => {
    socket2.on('room_state', (state) => {
      if (state.isRevealed) resolve(state);
    });
  });

  const aliceRevealed = stateRevealed.participants.find(p => p.name === 'Alice');
  const bobRevealed = stateRevealed.participants.find(p => p.name === 'Bob');
  console.log(`✓ Revealed votes: Alice=${aliceRevealed.vote}, Bob=${bobRevealed.vote}`);
  if (aliceRevealed.vote !== '🦀') {
    throw new Error(`Expected Alice's revealed vote to be '🦀', got '${aliceRevealed.vote}'`);
  }

  // Alice resets votes
  socket1.emit('reset_votes');

  const stateReset = await new Promise((resolve) => {
    socket2.on('room_state', (state) => {
      if (!state.isRevealed) resolve(state);
    });
  });
  console.log('✓ Reset votes successfully. isRevealed:', stateReset.isRevealed);

  socket1.disconnect();
  socket2.disconnect();
  console.log('--- ALL REAL-TIME POKER TESTS PASSED! ---');
}

testPokerFlow().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
