import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useEffect, useRef } from 'react';
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
  onVersionRestoreRejected?: (payload: any) => void;
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
  onVersionRestoreRejected,
  setSendState,
}: UseBoardWsParams) {
  const onLockMessageRef = useRef(onLockMessage);
  const onCursorMessageRef = useRef(onCursorMessage);
  const onElementMessageRef = useRef(onElementMessage);
  const onRtcMessageRef = useRef(onRtcMessage);
  const onCallMessageRef = useRef(onCallMessage);
  const onBoardResetMessageRef = useRef(onBoardResetMessage);
  const onVersionRestoreRequestRef = useRef(onVersionRestoreRequest);
  const onVersionRestoreApprovedRef = useRef(onVersionRestoreApproved);
  const onVersionRestoreRejectedRef = useRef(onVersionRestoreRejected);
  const setSendRtcRef = useRef(setSendRtc);
  const setSendCallRef = useRef(setSendCall);
  const setSendStateRef = useRef(setSendState);

  useEffect(() => {
    onLockMessageRef.current = onLockMessage;
    onCursorMessageRef.current = onCursorMessage;
    onElementMessageRef.current = onElementMessage;
    onRtcMessageRef.current = onRtcMessage;
    onCallMessageRef.current = onCallMessage;
    onBoardResetMessageRef.current = onBoardResetMessage;
    onVersionRestoreRequestRef.current = onVersionRestoreRequest;
    onVersionRestoreApprovedRef.current = onVersionRestoreApproved;
    onVersionRestoreRejectedRef.current = onVersionRestoreRejected;
    setSendRtcRef.current = setSendRtc;
    setSendCallRef.current = setSendCall;
    setSendStateRef.current = setSendState;
  }, [
    onLockMessage,
    onCursorMessage,
    onElementMessage,
    onRtcMessage,
    onCallMessage,
    onBoardResetMessage,
    onVersionRestoreRequest,
    onVersionRestoreApproved,
    onVersionRestoreRejected,
    setSendRtc,
    setSendCall,
    setSendState,
  ]);

  useEffect(() => {
    if (!boardUuid) return;

    const token = localStorage.getItem('token');
    const WS_BASE_URL =
      import.meta.env.VITE_WS_BASE_URL || import.meta.env.VITE_API_BASE_URL;

    const client = new Client({
      webSocketFactory: () => new SockJS(`${WS_BASE_URL}/ws`),
      reconnectDelay: 5000,
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
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

      client.subscribe(`/topic/boards/${boardUuid}/locks`, (message: IMessage) => {
        const body = JSON.parse(message.body);
        onLockMessageRef.current?.(body);
      });

      client.subscribe(`/topic/boards/${boardUuid}/cursors`, (message: IMessage) => {
        const body = JSON.parse(message.body);
        onCursorMessageRef.current?.(body);
      });

      client.subscribe(`/topic/boards/${boardUuid}/elements`, (message: IMessage) => {
        const body = JSON.parse(message.body);
        onElementMessageRef.current?.(body);
      });

      client.subscribe(`/topic/boards/${boardUuid}/state`, (message: IMessage) => {
        const body = JSON.parse(message.body);

        if (body.type === 'BOARD_RESET_TO_VERSION') {
          const elements = body.payload?.elements ?? [];
          onBoardResetMessageRef.current?.(elements);
          return;
        }
        if (body.type === 'VERSION_RESTORE_REQUEST') {
          onVersionRestoreRequestRef.current?.(body.payload);
          return;
        }
        if (body.type === 'VERSION_RESTORE_APPROVED') {
          onVersionRestoreApprovedRef.current?.(body.payload);
          return;
        }
        if (body.type === 'VERSION_RESTORE_REJECTED') {
          onVersionRestoreRejectedRef.current?.(body.payload);
          return;
        }
      });

      client.subscribe(`/topic/boards/${boardUuid}/rtc`, (frame) => {
        const msg = JSON.parse(frame.body);
        onRtcMessageRef.current?.(msg);
      });

      client.subscribe(`/topic/boards/${boardUuid}/call`, (frame) => {
        const msg = JSON.parse(frame.body);
        onCallMessageRef.current?.(msg);
      });

      setSendRtcRef.current?.((msg: any) => {
        if (!client.connected) return;
        client.publish({
          destination: '/app/boards/rtc',
          body: JSON.stringify(msg),
        });
      });

      setSendCallRef.current?.((msg: any) => {
        if (!client.connected) return;
        client.publish({
          destination: '/app/boards/call',
          body: JSON.stringify(msg),
        });
      });

      setSendStateRef.current?.((msg: any) => {
        if (!client.connected) return;
        console.log('SEND STATE', JSON.stringify(msg));
        client.publish({
          destination: `/app/boards/${boardUuid}/state`,
          body: JSON.stringify(msg),
        });
      });
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
  }, [boardUuid]);
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