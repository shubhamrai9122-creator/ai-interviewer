import React, { useState, useEffect, useRef } from 'react';
import { Camera, CameraOff, Monitor, MonitorOff, ShieldCheck, AlertCircle, Video } from 'lucide-react';

export default function ScreenAndCameraRecorder({
  isStarted = false,
  onIntegrityAlert = () => {}
}) {
  const [cameraActive, setCameraActive] = useState(false);
  const [screenActive, setScreenActive] = useState(false);
  const [camPermissionError, setCamPermissionError] = useState(null);
  const [screenPermissionError, setScreenPermissionError] = useState(null);

  const videoRef = useRef(null);
  const screenVideoRef = useRef(null);
  const camStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const camRecorderRef = useRef(null);
  const screenRecorderRef = useRef(null);

  // Initialize Front Camera
  const startCamera = async () => {
    try {
      setCamPermissionError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 320 },
          height: { ideal: 240 },
          facingMode: 'user'
        },
        audio: false // audio handled by voice engine
      });

      camStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);

      // Start MediaRecorder if supported
      try {
        const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
        recorder.start(5000);
        camRecorderRef.current = recorder;
      } catch (recErr) {
        console.warn('Camera recorder note:', recErr);
      }
    } catch (err) {
      console.warn('Camera access error:', err);
      setCamPermissionError(err.message || 'Camera permission denied');
      setCameraActive(false);
    }
  };

  // Stop Camera
  const stopCamera = () => {
    if (camStreamRef.current) {
      camStreamRef.current.getTracks().forEach(track => track.stop());
      camStreamRef.current = null;
    }
    if (camRecorderRef.current && camRecorderRef.current.state !== 'inactive') {
      try { camRecorderRef.current.stop(); } catch (e) {}
    }
    setCameraActive(false);
  };

  // Initialize Screen Recording
  const startScreenRecording = async () => {
    try {
      setScreenPermissionError(null);
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' },
        audio: false
      });

      screenStreamRef.current = stream;
      if (screenVideoRef.current) {
        screenVideoRef.current.srcObject = stream;
      }
      setScreenActive(true);

      // Handle user stopping screen share from browser banner
      stream.getVideoTracks()[0].onended = () => {
        setScreenActive(false);
        onIntegrityAlert('SCREEN_SHARE_STOPPED', 'Candidate terminated screen recording stream.');
      };

      // Start MediaRecorder for screen
      try {
        const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
        recorder.start(5000);
        screenRecorderRef.current = recorder;
      } catch (recErr) {
        console.warn('Screen recorder note:', recErr);
      }
    } catch (err) {
      console.warn('Screen recording error:', err);
      setScreenPermissionError(err.message || 'Screen recording permission denied');
      setScreenActive(false);
    }
  };

  // Stop Screen Recording
  const stopScreenRecording = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
    }
    if (screenRecorderRef.current && screenRecorderRef.current.state !== 'inactive') {
      try { screenRecorderRef.current.stop(); } catch (e) {}
    }
    setScreenActive(false);
  };

  // Auto-launch camera when viva starts
  useEffect(() => {
    if (isStarted) {
      startCamera();
    }
    return () => {
      stopCamera();
      stopScreenRecording();
    };
  }, [isStarted]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {/* Front Camera Widget */}
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: '240px',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        background: '#0F172A',
        border: '1.5px solid var(--rule)',
        boxShadow: 'var(--shadow-card)'
      }}>
        {cameraActive ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: '100%',
                height: '140px',
                objectFit: 'cover',
                display: 'block',
                transform: 'scaleX(-1)' // Mirror effect for natural webcam
              }}
            />
            {/* Status Overlays */}
            <div style={{
              position: 'absolute',
              top: '8px',
              left: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(15, 23, 42, 0.75)',
              backdropFilter: 'blur(4px)',
              padding: '2px 8px',
              borderRadius: '999px',
              fontSize: '10px',
              fontFamily: 'var(--mono)',
              color: '#FFFFFF'
            }}>
              <span className="sun-pulse" style={{ width: '6px', height: '6px', background: '#EF4444' }} />
              <span>REC FRONT CAM</span>
            </div>

            <button
              onClick={stopCamera}
              style={{
                position: 'absolute',
                bottom: '6px',
                right: '6px',
                background: 'rgba(15, 23, 42, 0.75)',
                border: 'none',
                borderRadius: '50%',
                padding: '4px',
                color: '#CBD5E1',
                cursor: 'pointer'
              }}
              title="Pause Camera"
            >
              <CameraOff size={13} />
            </button>
          </>
        ) : (
          <div style={{
            height: '140px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '12px',
            textAlign: 'center',
            color: '#94A3B8'
          }}>
            <Camera size={22} style={{ marginBottom: '6px' }} />
            <span style={{ fontSize: '11px', fontWeight: 600 }}>Front Camera Inactive</span>
            <button
              onClick={startCamera}
              className="btn btn-secondary"
              style={{ fontSize: '10px', padding: '3px 8px', marginTop: '6px' }}
            >
              Enable Camera
            </button>
          </div>
        )}
      </div>

      {/* Screen Recording Widget & Toggle */}
      <div style={{
        padding: '10px 14px',
        borderRadius: 'var(--radius-md)',
        background: screenActive ? '#ECFDF5' : '#F8FAFC',
        border: `1px solid ${screenActive ? '#10B981' : 'var(--rule)'}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        maxWidth: '240px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Monitor size={15} color={screenActive ? '#059669' : 'var(--muted)'} />
          <div>
            <span style={{ fontSize: '11px', fontWeight: 700, color: screenActive ? '#065F46' : 'var(--ink)' }}>
              {screenActive ? 'Screen Recording' : 'Screen Record'}
            </span>
            <div style={{ fontSize: '9px', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
              {screenActive ? '● REC ACTIVE' : 'Anti-Cheating Off'}
            </div>
          </div>
        </div>

        <button
          onClick={screenActive ? stopScreenRecording : startScreenRecording}
          className={`btn ${screenActive ? 'btn-secondary' : 'btn-primary'}`}
          style={{ fontSize: '10px', padding: '3px 8px' }}
        >
          {screenActive ? 'Stop' : 'Start REC'}
        </button>
      </div>

      {/* Hidden screen video element for stream sink */}
      <video ref={screenVideoRef} autoPlay playsInline muted style={{ display: 'none' }} />
    </div>
  );
}
