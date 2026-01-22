export enum SocketEvents {
  JOIN_ROOM = 'join_room',
  PLAY_CARD = 'play_card',
  DRAW_CARD = 'draw_card',
  
  GAME_STATE_UPDATE = 'game_state_update',
  PLAYER_JOINED = 'player_joined',
  PLAYER_LEFT = 'player_left',
  INVALID_MOVE = 'invalid_move',
  GAME_STARTED = 'game_started',
  GAME_OVER = 'game_over'
}