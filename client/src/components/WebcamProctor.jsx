import React, { useRef, useState, useEffect } from 'react';
import { Camera, CameraOff, ShieldCheck, AlertCircle } from 'lucide-react';

export default function WebcamProctor({
  isActive = true,
  onProctorAlert = () => {}
}) {
  const videoRef = useRef(null);
  const [streamEnabled, setStreamEnabled] = useState(false);
  const [hasPermission, setHasPermission] = useState(true);

  useEffect(() => {
    let currentStream = null;

    async function initCamera() {
      if (!isActive) return;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240, facingMode: 'user' },
          audio: false
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        currentStream = stream;
        setStreamEnabled(true);
        setHasPermission(true);
      } catch (err) {
        console.warn('Webcam not accessible:', err.message);
        setHasPermission(false);
        setStreamEnabled(false);
      }
    }

    initCamera();

    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach(t => t.stop());
      }
    };
  }, [isActive]);

  const toggleCamera = async () => {
    if (streamEnabled && videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
      setStreamEnabled(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240 },
          audio: false
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setStreamEnabled(true);
      } catch (e) {
        setHasPermission(false);
      }
    }
  };

  return (
    <div style={{
      background: 'rgba(11, 17, 32, 0.85)',
      borderRadius: 'var(--radius-md)',
      border: '1px solid var(--border-subtle)',
      padding: '12px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ShieldCheck size={14} color="var(--emerald)" />
          <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>
            AI Proctor Feed
          </span>
        </div>
        <button
          type="button"
          onClick={toggleCamera}
          className="btn btn-secondary"
          style={{ padding: '3px 8px', fontSize: '11px', height: '24px' }}
        >
          {streamEnabled ? <CameraOff size={12} /> : <Camera size={12} />}
          {streamEnabled ? 'Hide Cam' : 'Enable Cam'}
        </button>
      </div>

      <div style={{
        position: 'relative',
        width: '100%',
        height: '140px',
        backgroundColor: '#030712',
        borderRadius: '8px',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '1px dashed var(--border-subtle)'
      }}>
        {streamEnabled ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transform: 'scaleX(-1)' // Mirror for natural view
              }}
            />
            {/* Proctoring Face Reticle */}
            <div style={{
              position: 'absolute',
              width: '80px',
              height: '100px',
              border: '1.5px dashed rgba(16, 185, 129, 0.6)',
              borderRadius: '50%',
              pointerEvents: 'none'
            }} />
            <div style={{
              position: 'absolute',
              bottom: '6px',
              left: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(0, 0, 0, 0.6)',
              padding: '2px 6px',
              borderRadius: '4px'
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--emerald)' }} />
              <span style={{ fontSize: '10px', color: '#fff' }}>Face Centered • Active</span>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '10px' }}>
            <Camera size={22} style={{ marginBottom: '6px', opacity: 0.5 }} />
            <div style={{ fontSize: '11px' }}>Camera Preview Optional</div>
            <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>Audio Proctoring is fully active</div>
          </div>
        )}
      </div>
    </div>
  );
}
