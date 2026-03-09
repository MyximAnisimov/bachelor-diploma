import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useEffect } from 'react';
import { clientId } from '../api/clientId';

interface UseBoardWsParams {
  boardUuid: string;
  onLockMessage: (msg: any) => void;
  onCursorMessage: (msg: any) => void;
  onElementMessage: (msg: any) => void;
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
  onElementMessage
}: UseBoardWsParams) {
  useEffect(() => {
    const client = new Client({
      webSocketFactory: () => new SockJS('http://localhost:8080/ws'),
      reconnectDelay: 5000,
        debug: (str) => {
          console.log('STOMP:', str);
        },
    });

    stompClient = client;

    client.onConnect = () => {
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
          console.log('WS RAW LOCK MESSAGE', body);
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
    };

    client.activate();

    return () => {
      client.deactivate();
      if (stompClient === client) {
        stompClient = null;
      }
    };
  }, [boardUuid, onLockMessage, onCursorMessage, onElementMessage]);
}

export function sendLock(
  boardUuid: string,
  elementIds: number[],
  action: 'LOCK' | 'UNLOCK',
) {
 if (!stompClient || !stompClient.connected) {
    console.warn('sendLock: stompClient not connected, queueing lock');
    pendingLocks.push({ boardUuid, elementIds, action, clientId });
    return;
  }

  console.log('sendLock PUBLISH', {
    boardUuid,
    elementIds,
    clientId,
    action,
  });

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

export function sendCursor(boardUuid: string, x: number, y: number) {

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
    }),
  });
}