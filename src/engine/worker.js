import { findBestMove } from './engine.js';

self.onmessage = ({ data: { position, limits } }) => {
  try {
    self.postMessage(findBestMove(position.board, position.turn, limits));
  } catch (err) {
    self.postMessage({ error: err.message });
  }
};
