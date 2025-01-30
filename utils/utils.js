// recordingUtils.js

/**
 * Converts a Blob to a base64 string
 * @param {Blob} blob - The blob to convert
 * @returns {Promise<string>} - Base64 string representation of the blob
 */
export const convertBlobToBase64 = (blob) => {
    return new Promise((resolve) => {
        const fileReader = new FileReader();
        fileReader.readAsDataURL(blob);
        fileReader.onloadend = () => {
            resolve(fileReader.result);
        };
    });
};

/**
 * Fetches a blob from a URL and converts it to base64
 * @param {string} url - The URL to fetch
 * @returns {Promise<string>} - Base64 string representation of the fetched blob
 */
export const fetchBlobAsBase64 = async (url) => {
    const response = await fetch(url);
    const blob = await response.blob();
    return convertBlobToBase64(blob);
};

/**
 * Gets the media stream for the microphone
 * @param {Object} options - Options for getUserMedia
 * @returns {Promise<MediaStream>} - The media stream for the microphone
 */
export const getMicrophoneStream = async (options = { echoCancellation: false }) => {
    return navigator.mediaDevices.getUserMedia({
        audio: options,
    });
};

/**
 * Handles the recording data availability
 * @param {BlobEvent} event - The event containing the recorded data
 * @param {Array} chunks - Array to store recorded chunks
 */
export const handleDataAvailable = (event, chunks) => {
    chunks.push(event.data);
};

/**
 * Creates a MediaRecorder instance with common configuration
 * @param {MediaStream} stream - The media stream to record
 * @param {Array} chunks - Array to store recorded chunks
 * @param {Function} onStop - Callback function when recording stops
 * @returns {MediaRecorder} - Configured MediaRecorder instance
 */
export const createMediaRecorder = (stream, chunks, onStop) => {
    const recorder = new MediaRecorder(stream, {
        mimeType: "video/webm",
        videoBitsPerSecond: 5000000,
    });

    recorder.ondataavailable = (event) => handleDataAvailable(event, chunks);
    recorder.onstop = onStop;

    return recorder;
};

/**
 * Combines multiple audio tracks with a video track
 * @param {MediaStream[]} audioStreams - Array of audio streams to combine
 * @param {MediaStreamTrack} videoTrack - Video track to include
 * @returns {MediaStream} - Combined media stream
 */
export const combineMediaStreams = (audioStreams, videoTrack) => {
    const audioContext = new AudioContext();
    const audioDestination = audioContext.createMediaStreamDestination();

    audioStreams.forEach(stream => {
        audioContext.createMediaStreamSource(stream)
            .connect(audioDestination);
    });

    return new MediaStream([
        videoTrack,
        audioDestination.stream.getTracks()[0],
    ]);
};

/**
 * Stops all tracks in a media stream
 * @param {MediaStream} stream - The media stream to stop
 */
export const stopMediaTracks = (stream) => {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
};

/**
 * Creates a download URL for recorded data
 * @param {Blob[]} chunks - Array of recorded chunks
 * @param {string} mimeType - MIME type of the recording
 * @returns {string} - URL for the recorded data
 */
export const createRecordingUrl = (chunks, mimeType = 'video/webm') => {
    const blob = new Blob(chunks, { type: mimeType });
    return URL.createObjectURL(blob);
};