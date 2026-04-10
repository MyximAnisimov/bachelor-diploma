import { useEffect, useRef, useState, useCallback } from 'react';
import { clientId } from '../api/clientId';
import { useBoardWs } from '../hooks/useBoardsWs';

export type RtcSignalMessage =
  | {
      type: 'RTC_JOINED';
      boardUuid: string;
      from: string;
    }
  | {
      type: 'RTC_OFFER';
      boardUuid: string;
      from: string;
      to: string;
      sdp: RTCSessionDescriptionInit;
    }
  | {
      type: 'RTC_ANSWER';
      boardUuid: string;
      from: string;
      to: string;
      sdp: RTCSessionDescriptionInit;
    }
  | {
      type: 'RTC_ICE_CANDIDATE';
      boardUuid: string;
      from: string;
      to: string;
      candidate: RTCIceCandidateInit;
    }
  | {
      type: 'RTC_LEAVE';
      boardUuid: string;
      from: string;
    };

type RemoteStreamInfo = {
  clientId: string;
  stream: MediaStream;
};

export function useBoardWebRTC(boardUuid: string | undefined) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<RemoteStreamInfo[]>([]);
  const [inCall, setInCall] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(true);

  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const sendRtcRef = useRef<(msg: RtcSignalMessage) => void>(() => {});
  const joinedRef = useRef(false);
  const participantsRef = useRef<Set<string>>(new Set());

  function sendRtc(msg: RtcSignalMessage) {
    sendRtcRef.current?.(msg);
  }

  useEffect(() => {
    if (!boardUuid) return;

    let cancelled = false;

    async function initMedia() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        setLocalStream(stream);
      } catch (e) {
        console.error('getUserMedia error', e);
      }
    }

    initMedia();

    return () => {
      cancelled = true;
      setLocalStream((prev) => {
        prev?.getTracks().forEach((t) => t.stop());
        return null;
      });
    };
  }, [boardUuid]);

  const addRemoteStream = useCallback((otherClientId: string, stream: MediaStream) => {
    setRemoteStreams((prev) => {
      const exists = prev.some((s) => s.clientId === otherClientId);
      if (exists) {
        return prev.map((s) =>
          s.clientId === otherClientId ? { ...s, stream } : s,
        );
      }
      return [...prev, { clientId: otherClientId, stream }];
    });
  }, []);

  const removeRemoteStream = useCallback((otherClientId: string) => {
    setRemoteStreams((prev) => prev.filter((s) => s.clientId !== otherClientId));
  }, []);

  function createPeerConnection(otherClientId: string): RTCPeerConnection {
    let pc = peerConnectionsRef.current.get(otherClientId);
    if (pc) return pc;

    pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    pc.ontrack = (event) => {
      const [stream] = event.streams;
      addRemoteStream(otherClientId, stream);
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && boardUuid) {
        const msg: RtcSignalMessage = {
          type: 'RTC_ICE_CANDIDATE',
          boardUuid,
          from: clientId,
          to: otherClientId,
          candidate: event.candidate.toJSON(),
        };
        sendRtc(msg);
      }
    };

    pc.onconnectionstatechange = () => {
      if (
        pc &&
        (pc.connectionState === 'failed' || pc.connectionState === 'disconnected')
      ) {
        removeRemoteStream(otherClientId);
        pc.close();
        peerConnectionsRef.current.delete(otherClientId);
      }
    };

    if (localStream) {
      localStream.getTracks().forEach((track) => {
        pc!.addTrack(track, localStream);
      });
    }

    peerConnectionsRef.current.set(otherClientId, pc);
    return pc;
  }

  useBoardWs({
    boardUuid: boardUuid!,
    onLockMessage: () => {},
    onCursorMessage: () => {},
    onElementMessage: () => {},

    onRtcMessage: async (msg: RtcSignalMessage) => {
      if (!boardUuid) return;

      if ('from' in msg && msg.from === clientId) return;

      if (msg.type === 'RTC_JOINED') {
        participantsRef.current.add(msg.from);

        if (joinedRef.current && localStream && msg.from !== clientId) {
          const pc = createPeerConnection(msg.from);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);

          sendRtc({
            type: 'RTC_OFFER',
            boardUuid,
            from: clientId,
            to: msg.from,
            sdp: offer,
          });
        }
      } else if (msg.type === 'RTC_OFFER') {
        if (msg.to !== clientId) return;

        const pc = createPeerConnection(msg.from);
        await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        sendRtc({
          type: 'RTC_ANSWER',
          boardUuid,
          from: clientId,
          to: msg.from,
          sdp: answer,
        });
        joinedRef.current = true;
        setInCall(true);
      } else if (msg.type === 'RTC_ANSWER') {
        if (msg.to !== clientId) return;

        const pc = createPeerConnection(msg.from);
        await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
        joinedRef.current = true;
        setInCall(true);
      } else if (msg.type === 'RTC_ICE_CANDIDATE') {
        if (msg.to !== clientId) return;

        const pc = createPeerConnection(msg.from);
        try {
          await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
        } catch (e) {
          console.error('addIceCandidate error', e);
        }
      } else if (msg.type === 'RTC_LEAVE') {
        participantsRef.current.delete(msg.from);
        const pc = peerConnectionsRef.current.get(msg.from);
        if (pc) {
          pc.close();
          peerConnectionsRef.current.delete(msg.from);
        }
        removeRemoteStream(msg.from);
      }
    },

    setSendRtc: (fn) => {
      sendRtcRef.current = fn as (msg: RtcSignalMessage) => void;
    },

  });

  async function startCall() {
    if (!boardUuid || !localStream) {
      console.warn('Cannot start call:', { boardUuid, localStream });
      return;
    }

    if (joinedRef.current) return;

    sendRtc({
      type: 'RTC_JOINED',
      boardUuid,
      from: clientId,
    });

    joinedRef.current = true;
    setInCall(true);
  }

  function leaveCall() {
    if (!boardUuid) return;

    joinedRef.current = false;
    setInCall(false);

    // закрываем все PC
    peerConnectionsRef.current.forEach((pc, otherId) => {
      pc.close();
      removeRemoteStream(otherId);
    });
    peerConnectionsRef.current.clear();
    participantsRef.current.clear();

    sendRtc({
      type: 'RTC_LEAVE',
      boardUuid,
      from: clientId,
    });
  }

  function toggleCamera() {
    if (!localStream) return;
    const enabled = !cameraEnabled;
    localStream.getVideoTracks().forEach((t) => (t.enabled = enabled));
    setCameraEnabled(enabled);
  }

  function toggleMic() {
    if (!localStream) return;
    const enabled = !micEnabled;
    localStream.getAudioTracks().forEach((t) => (t.enabled = enabled));
    setMicEnabled(enabled);
  }

  return {
    localStream,
    remoteStreams,
    inCall,
    startCall,
    leaveCall,
    cameraEnabled,
    micEnabled,
    toggleCamera,
    toggleMic,
  };
}