// Listen for messages from the service worker
chrome.runtime.onMessage.addListener((message, sender) => {
    switch (message.type) {
        case "start-recording":
            startRecording(message.data);
            break;
        case "stop-recording":
            stopRecording();
            break;
        default:
            console.warn("Unknown request type:");
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

        mediaRecorder.stream.getTracks().forEach((track) => track.stop());
    }
    await stopTabCapture();
}

/**
 * Stops the tab capture session if active.
 */
async function stopTabCapture () {
    try {
        const stream = await chrome.tabCapture.getCapturedTabs();
        if (stream && stream.length > 0) {
            stream[0].getTracks().forEach((track) => track.stop());
        }
    } catch (error) {
        throw new Error("[offscreen] Error stopping tab capture:", error);
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

        // Create media streams for tab capture and microphone
        const tabStream = await getTabMediaStream(streamId);
        const micStream = await getMicrophoneStream();

        // Combine tab and microphone streams
        const combinedStream = combineMediaStreams(tabStream, micStream);

        mediaRecorder = new MediaRecorder(combinedStream, {
            mimeType: "video/webm",
            videoBitsPerSecond: 5000000, 
        });

        mediaRecorder.ondataavailable = handleDataAvailable;
        mediaRecorder.onstop = handleRecordingStop;

        mediaRecorder.start();
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
                maxWidth: 1920, 
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
    recordedChunks.push(event.data);
}

/**
 * Handles the `onstop` event for the MediaRecorder.
 */

async function handleRecordingStop () {
    const recordedBlob = new Blob(recordedChunks, { type: "video/webm" });
    const videoURL = URL.createObjectURL(recordedBlob);
    window.open(videoURL);
    recordedChunks = [];
}
