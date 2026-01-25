export enum SocketEvents {
  // Client → Server
  CREATE_ROOM = 'create_room',
  JOIN_ROOM = 'join_room',
  LEAVE_ROOM = 'leave_room',
  PLAYER_READY = 'player_ready',
  START_GAME = 'start_game',
  PLAY_CARD = 'play_card',
  DRAW_CARD = 'draw_card',
  PASS_TURN = 'pass_turn',
  SAY_UNO = 'say_uno',
  CHALLENGE_UNO = 'challenge_uno',
  
  // Server → Client
  CREATE_ROOM_SUCCESS = 'create_room_success',
  CREATE_ROOM_ERROR = 'create_room_error',
  JOIN_ROOM_ERROR = 'join_room_error',
  PLAYER_JOINED = 'player_joined',
  PLAYER_LEFT = 'player_left',
  PLAYER_READY_CHANGED = 'player_ready_changed',
  GAME_STATE_UPDATE = 'game_state_update',
  GAME_STARTED = 'game_started',
  GAME_OVER = 'game_over',
  INVALID_MOVE = 'invalid_move',
  ERROR = 'error',
  PLAYER_SAID_UNO = 'player_said_uno',
  UNO_PENALTY = 'uno_penalty',
}