export type RtcSignalMessage =
  | {
      type: 'RTC_OFFER';
      boardUuid: string;
      from: string;
      to: string | null;
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
      to: string | null;
      candidate: RTCIceCandidateInit;
    }
  | {
      type: 'RTC_LEAVE';
      boardUuid: string;
      from: string;
    }
  | {
      type: 'RTC_JOINED';
      boardUuid: string;
      from: string;
    };