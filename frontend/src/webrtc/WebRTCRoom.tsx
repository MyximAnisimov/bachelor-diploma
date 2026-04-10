import React from 'react';

type Props = {
  localStream: MediaStream | null;
  remoteStreams: { clientId: string; stream: MediaStream }[];
  inCall: boolean;
  cameraEnabled: boolean;
  micEnabled: boolean;
  onToggleCamera: () => void;
  onToggleMic: () => void;
  onLeave: () => void;
};

export const WebRTCRoom: React.FC<Props> = ({
  localStream,
  remoteStreams,
  inCall,
  cameraEnabled,
  micEnabled,
  onToggleCamera,
  onToggleMic,
  onLeave,
}) => {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: '#000',
        color: '#fff',
      }}
    >
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: 4,
          padding: 4,
        }}
      >
        {localStream && (
          <video
            autoPlay
            muted
            playsInline
            ref={(el) => {
              if (el && localStream) {
                if (el.srcObject !== localStream) {
                  el.srcObject = localStream;
                }
              }
            }}
            style={{ width: '100%', height: '100%', objectFit: 'cover', background: '#222' }}
          />
        )}

        {remoteStreams.map(({ clientId, stream }) => (
          <video
            key={clientId}
            autoPlay
            playsInline
            ref={(el) => {
              if (el && stream) {
                if (el.srcObject !== stream) {
                  el.srcObject = stream;
                }
              }
            }}
            style={{ width: '100%', height: '100%', objectFit: 'cover', background: '#222' }}
          />
        ))}
      </div>

      <div
        style={{
          padding: '4px 8px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTop: '1px solid rgba(255,255,255,0.2)',
        }}
      >
        <span style={{ fontSize: 12 }}>
          {inCall ? 'В звонке' : 'Не в звонке'}
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onToggleCamera}
            style={{
              padding: '4px 8px',
              background: cameraEnabled ? '#1976d2' : '#555',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
            }}
          >
            Камера {cameraEnabled ? 'вкл' : 'выкл'}
          </button>
          <button
            onClick={onToggleMic}
            style={{
              padding: '4px 8px',
              background: micEnabled ? '#1976d2' : '#555',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
            }}
          >
            Микрофон {micEnabled ? 'вкл' : 'выкл'}
          </button>
          <button
            onClick={onLeave}
            style={{
              padding: '4px 8px',
              background: '#d32f2f',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
            }}
          >
            Выйти
          </button>
        </div>
      </div>
    </div>
  );
};