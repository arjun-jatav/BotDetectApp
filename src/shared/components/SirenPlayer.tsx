import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { subscribeSirenEvents, stopSiren } from '../services/siren';

const SIREN_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="background:transparent;">
  <script>
    let audioCtx = null;
    let osc = null;
    let gainNode = null;
    let sirenInterval = null;

    function startSiren() {
      try {
        if (!audioCtx) {
          audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
          audioCtx.resume();
        }

        if (osc) {
          stopSiren();
        }

        osc = audioCtx.createOscillator();
        gainNode = audioCtx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(1.0, audioCtx.currentTime);

        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        osc.start();

        let high = false;
        clearInterval(sirenInterval);
        sirenInterval = setInterval(() => {
          if (!osc || !audioCtx) return;
          const targetFreq = high ? 750 : 1550;
          osc.frequency.exponentialRampToValueAtTime(targetFreq, audioCtx.currentTime + 0.35);
          high = !high;
        }, 380);
      } catch (e) {
        console.error('Error starting web siren:', e);
      }
    }

    function stopSiren() {
      try {
        clearInterval(sirenInterval);
        if (osc) {
          osc.stop();
          osc.disconnect();
          osc = null;
        }
      } catch (e) {}
    }

    window.document.addEventListener('message', function(e) {
      handleMsg(e.data);
    });
    window.addEventListener('message', function(e) {
      handleMsg(e.data);
    });

    function handleMsg(data) {
      if (data === 'PLAY') {
        startSiren();
      } else if (data === 'STOP') {
        stopSiren();
      }
    }
  </script>
</body>
</html>
`;

export function SirenPlayer() {
  const webViewRef = useRef<WebView<object>>(null);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeSirenEvents((action) => {
      if (action === 'PLAY') {
        setIsActive(true);
        webViewRef.current?.injectJavaScript('startSiren(); true;');
      } else if (action === 'STOP') {
        setIsActive(false);
        webViewRef.current?.injectJavaScript('stopSiren(); true;');
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  if (Platform.OS !== 'android') {
    return null;
  }

  return (
    <>
      <View style={styles.hidden} pointerEvents="none">
        <WebView
          ref={webViewRef}
          originWhitelist={['*']}
          source={{ html: SIREN_HTML }}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          mediaPlaybackRequiresUserAction={false}
          allowsInlineMediaPlayback={true}
          mixedContentMode="always"
          style={styles.hidden}
        />
      </View>

      {isActive && (
        <View style={styles.bannerContainer}>
          <View style={styles.bannerContent}>
            <Text style={styles.bannerTitle}>🚨 SIREN ALARM ACTIVE</Text>
            <Text style={styles.bannerSubtitle}>Notification alert is playing</Text>
          </View>
          <TouchableOpacity
            style={styles.stopButton}
            onPress={() => stopSiren()}
            activeOpacity={0.8}
          >
            <Text style={styles.stopButtonText}>SILENCE</Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  hidden: {
    width: 0,
    height: 0,
    position: 'absolute',
    opacity: 0,
  },
  bannerContainer: {
    position: 'absolute',
    top: 48,
    left: 16,
    right: 16,
    backgroundColor: '#DC2626',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 999,
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  bannerContent: {
    flex: 1,
    marginRight: 12,
  },
  bannerTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  bannerSubtitle: {
    color: '#FEE2E2',
    fontSize: 12,
    marginTop: 2,
  },
  stopButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  stopButtonText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
