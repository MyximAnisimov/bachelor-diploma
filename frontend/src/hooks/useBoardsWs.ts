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
  onElementMessage,
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
  }, [boardUuid, onLockMessage, onCursorMessage, onElementMessage]);
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