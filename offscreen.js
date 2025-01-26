// Listen for messages from the service worker
chrome.runtime.onMessage.addListener((message, sender) => {
    console.log("[offscreen] Message received:", message, sender);

    switch (message.type) {
        case "start-recording":
            console.log("[offscreen] Starting recording for tab");
            startRecording(message.data);
            break;
        case "stop-recording":
            console.log("[offscreen] Stopping recording for tab");
            stopRecording();
            break;
        default:
            console.log("[offscreen] Unhandled message type");
    }

    return true;
});

let mediaRecorder = null;
let recordedChunks = [];

/**
 * Stops the recording and handles the cleanup.
 */
async function stopRecording () {
    console.log("[offscreen] Stopping recording");

    if (mediaRecorder?.state === "recording") {
        mediaRecorder.stop();

        // Stop all associated media tracks
        mediaRecorder.stream.getTracks().forEach((track) => track.stop());
    }

    // Stop tab capture if active
    await stopTabCapture();
}

/**
 * Stops the tab capture session if active.
 */
async function stopTabCapture () {
    try {
        // End the tab capture session
        const stream = await chrome.tabCapture.getCapturedTabs();
        if (stream && stream.length > 0) {
            stream[0].getTracks().forEach((track) => track.stop());
            console.log("[offscreen] Tab capture stopped");
        }
    } catch (error) {
        console.error("[offscreen] Error stopping tab capture:", error);
    }
}

/**
 * Starts the recording process for the provided stream ID.
 * @param {string} streamId - The stream ID for the tab to be recorded.
 */
async function startRecording (streamId) {
    try {
        if (mediaRecorder?.state === "recording") {
            throw new Error("[offscreen] Recording is already in progress.");
        }

        console.log("[offscreen] Starting recording for stream ID:", streamId);

        // Create media streams for tab capture and microphone
        const tabStream = await getTabMediaStream(streamId);
        const micStream = await getMicrophoneStream();

        // Combine tab and microphone streams
        const combinedStream = combineMediaStreams(tabStream, micStream);

        // Initialize MediaRecorder
        mediaRecorder = new MediaRecorder(combinedStream, {
            mimeType: "video/webm",
            videoBitsPerSecond: 5000000, // 5 Mbps for better quality
        });

        // Handle recording data
        mediaRecorder.ondataavailable = handleDataAvailable;
        mediaRecorder.onstop = handleRecordingStop;

        // Start recording
        mediaRecorder.start();
        console.log("[offscreen] Recording started");
    } catch (error) {
        console.error("[offscreen] Error starting recording:", error);
    }
}

/**
 * Gets the media stream for the tab being captured.
 * @param {string} streamId - The stream ID for the tab.
 * @returns {Promise<MediaStream>} - The media stream for the tab.
 */
async function getTabMediaStream (streamId) {
    return navigator.mediaDevices.getUserMedia({
        audio: {
            mandatory: {
                chromeMediaSource: "tab",
                chromeMediaSourceId: streamId,
            },
        },
        video: {
            mandatory: {
                chromeMediaSource: "tab",
                chromeMediaSourceId: streamId,
                maxWidth: 1920, // Full HD resolution
                maxHeight: 1080,
                maxFrameRate: 30,
            },
        },
    });
}

/**
 * Gets the media stream for the microphone.
 * @returns {Promise<MediaStream>} - The media stream for the microphone.
 */
async function getMicrophoneStream () {
    return navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false },
    });
}

/**
 * Combines the tab and microphone media streams.
 * @param {MediaStream} tabStream - The media stream for the tab.
 * @param {MediaStream} micStream - The media stream for the microphone.
 * @returns {MediaStream} - The combined media stream.
 */
function combineMediaStreams (tabStream, micStream) {
    const audioContext = new AudioContext();
    const audioDestination = audioContext.createMediaStreamDestination();

    audioContext.createMediaStreamSource(micStream).connect(audioDestination);
    audioContext.createMediaStreamSource(tabStream).connect(audioDestination);

    return new MediaStream([
        tabStream.getVideoTracks()[0],
        audioDestination.stream.getTracks()[0],
    ]);
}

/**
 * Handles the `ondataavailable` event for the MediaRecorder.
 * @param {BlobEvent} event - The event containing the recorded data.
 */
function handleDataAvailable (event) {
    console.log("[offscreen] Data available:", event);
    recordedChunks.push(event.data);
}

/**
 * Handles the `onstop` event for the MediaRecorder.
 */
async function handleRecordingStop () {
    console.log("[offscreen] Recording stopped");

    // Combine recorded chunks into a single Blob
    const recordedBlob = new Blob(recordedChunks, { type: "video/webm" });

    // Generate a URL for the recorded video
    const videoURL = URL.createObjectURL(recordedBlob);

    // Open the video in a new tab
    console.log("[offscreen] Opening recorded video");
    window.open(videoURL);

    // Reset recorded chunks for the next recording session
    recordedChunks = [];
}
