import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useEffect } from 'react';
import { clientId } from '../api/clientId';

interface UseBoardWsParams {
  boardUuid: string;
  onLockMessage: (msg: any) => void;
  onCursorMessage: (msg: any) => void;
  onElementMessage: (msg: any) => void;
  onRtcMessage?: (msg: any) => void;
  setSendRtc?: (fn: (msg: any) => void) => void;
  onCallMessage?: (msg: any) => void;
  setSendCall?: (fn: (msg: any) => void) => void;
  onBoardResetMessage?: (elements: any[]) => void;

  onVersionRestoreRequest?: (payload: any) => void;
  onVersionRestoreApproved?: (payload: any) => void;
  setSendState?: (fn: (msg: any) => void) => void;
}

let stompClient: Client | null = null;

const pendingLocks: {
  boardUuid: string;
  elementIds: number[];
  action: 'LOCK' | 'UNLOCK';
  clientId: string;
}[] = [];

export function useBoardWs({
  boardUuid,
  onLockMessage,
  onCursorMessage,
  onElementMessage,
  onCallMessage,
  setSendCall,
  onRtcMessage,
  setSendRtc,
  onBoardResetMessage,
  onVersionRestoreRequest,
  onVersionRestoreApproved,
  setSendState,
}: UseBoardWsParams) {
  useEffect(() => {
    if (!boardUuid) {
      return;
    }

    const token = localStorage.getItem('token');

    const client = new Client({
      webSocketFactory: () => new SockJS('http://localhost:8080/ws'),
      reconnectDelay: 5000,
      debug: (str) => {
        console.log('STOMP:', str);
      },
      connectHeaders: token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {},
    });

    stompClient = client;

    client.onConnect = () => {
      console.log('STOMP connected');

      pendingLocks.forEach((msg) => {
        client.publish({
          destination: '/app/board.lock',
          body: JSON.stringify(msg),
        });
      });
      pendingLocks.length = 0;

      client.subscribe(
        `/topic/boards/${boardUuid}/locks`,
        (message: IMessage) => {
          const body = JSON.parse(message.body);
          onLockMessage(body);
        },
      );

      client.subscribe(
        `/topic/boards/${boardUuid}/cursors`,
        (message: IMessage) => {
          const body = JSON.parse(message.body);
          onCursorMessage(body);
        },
      );

      client.subscribe(
        `/topic/boards/${boardUuid}/elements`,
        (message: IMessage) => {
          const body = JSON.parse(message.body);
          onElementMessage(body);
        },
      );

      client.subscribe(
        `/topic/boards/${boardUuid}/state`,
        (message: IMessage) => {
          const body = JSON.parse(message.body);
          console.log('STATE MSG', body);

          if (body.type === 'BOARD_RESET_TO_VERSION') {
            const elements = body.payload?.elements ?? [];
            onBoardResetMessage?.(elements);
            return;
          }

          if (body.type === 'VERSION_RESTORE_REQUEST') {
            onVersionRestoreRequest?.(body.payload);
            return;
          }

          if (body.type === 'VERSION_RESTORE_APPROVED') {
            onVersionRestoreApproved?.(body.payload);
            return;
          }
        },
      );

      if (onRtcMessage) {
        client.subscribe(`/topic/boards/${boardUuid}/rtc`, (frame) => {
          const msg = JSON.parse(frame.body);
          onRtcMessage(msg);
        });
      }
      if (onCallMessage) {
        client.subscribe(`/topic/boards/${boardUuid}/call`, (frame) => {
          const msg = JSON.parse(frame.body);
          onCallMessage(msg);
        });
      }
      if (setSendRtc) {
        setSendRtc((msg: any) => {
          if (!stompClient || !stompClient.connected) return;
          stompClient.publish({
            destination: '/app/boards/rtc',
            body: JSON.stringify(msg),
          });
        });
      }
      if (setSendCall) {
        setSendCall((msg: any) => {
          if (!stompClient || !stompClient.connected) return;
          stompClient.publish({
            destination: '/app/boards/call',
            body: JSON.stringify(msg),
          });
        });
      }

    const sendState = (msg: any) => {
      if (!stompClient || !stompClient.connected) return;
      stompClient.publish({
        destination: `/app/boards/${boardUuid}/state`,
        body: JSON.stringify(msg),
      });
    };

    if (setSendState) {
      setSendState(sendState);
    }
    };

    client.onStompError = (frame) => {
      console.error('STOMP error', frame.headers['message'], frame.body);
    };

    client.onWebSocketError = (event) => {
      console.error('WS error', event);
    };

    client.activate();

    return () => {
      client.deactivate();
      if (stompClient === client) {
        stompClient = null;
      }
    };
  }, [
    boardUuid,
    onLockMessage,
    onCursorMessage,
    onElementMessage,
    onRtcMessage,
    setSendRtc,
      onCallMessage,
      setSendCall,
  ]);
}

export function sendLock(
  boardUuid: string,
  elementIds: number[],
  action: 'LOCK' | 'UNLOCK',
) {
  if (!stompClient || !stompClient.connected) {
    pendingLocks.push({ boardUuid, elementIds, action, clientId });
    return;
  }
  stompClient.publish({
    destination: '/app/board.lock',
    body: JSON.stringify({
      boardUuid,
      elementIds,
      clientId,
      action,
    }),
  });
}

export function sendCursor(boardUuid: string, x: number, y: number, displayName?: string,) {
  if (!stompClient || !stompClient.connected) {
    return;
  }
  stompClient.publish({
    destination: '/app/board.cursor',
    body: JSON.stringify({
      boardUuid,
      clientId,
      x,
      y,
      displayName,
    }),
  });
}

export function handleElementMessage(msg: ElementUpdatedMessage) {
  const isMine = msg.clientId === myClientId;

  if (msg.action === 'UPSERT') {
    applyElementChanges(
      [{ id: msg.element.id, patch: msg.element }],
      { recordHistory: isMine },
    );
  } else if (msg.action === 'DELETE') {
    applyElementChanges(
      [{ id: msg.element.id, patch: { deleted: true } as any }],
      { recordHistory: isMine },
    );
  }
}