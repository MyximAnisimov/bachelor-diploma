import { stompClient } from '../hooks/useBoardsWs';

import type { RtcSignalMessage } from './rtcTypes';

export function sendRtcSignal(msg: RtcSignalMessage) {
  if (!stompClient || !stompClient.connected) return;
  stompClient.send(
    `/app/boards/${msg.boardUuid}/rtc`,
    {},
    JSON.stringify(msg)
  );
}