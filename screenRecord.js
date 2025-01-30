const convertBlobToBase64 = (blob) => {
    return new Promise((resolve) => {
        const fileReader = new FileReader();
        fileReader.readAsDataURL(blob);
        fileReader.onloadend = () => {
            const base64Data = fileReader.result;
            resolve(base64Data);
        };
    });
};

const fetchBlobAsBase64 = async (url) => {
    const response = await fetch(url);
    const blob = await response.blob();
    const base64 = await convertBlobToBase64(blob);
    return base64;
};

chrome.runtime.onMessage.addListener((request, sender) => {
    console.log("Message received", request, sender);

    switch (request.type) {
        case "start-recording":
            startRecording(request.focusedTabId);
            break;
        case "stop-recording":
            stopRecording();
            break;
        default:
            console.log("Unknown message type");
    }

    return true;
});

let mediaRecorder;
let recordedChunks = [];

const stopRecording = () => {
    console.log("Stop recording");
    if (mediaRecorder?.state === "recording") {
        mediaRecorder.stop();
        mediaRecorder.stream.getTracks().forEach((track) => track.stop());
    }
};

const startRecording = async (focusedTabId) => {
    chrome.desktopCapture.chooseDesktopMedia(
        ["screen", "window"],
        async (streamId) => {
            if (!streamId) {
                return;
            }


            const screenStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    mandatory: {
                        chromeMediaSource: "desktop",
                        chromeMediaSourceId: streamId,
                    },
                },
                video: {
                    mandatory: {
                        chromeMediaSource: "desktop",
                        chromeMediaSourceId: streamId,
                        maxWidth: 3840,
                        maxHeight: 2160,
                        maxFrameRate: 60,
                    },
                },
            });

            console.log("Screen stream from desktop capture", screenStream);

            const microphoneStream = await navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: false },
            });

            if (microphoneStream.getAudioTracks().length > 0) {
                const combinedStream = new MediaStream([
                    screenStream.getVideoTracks()[0],
                    microphoneStream.getAudioTracks()[0],
                ]);


                mediaRecorder = new MediaRecorder(combinedStream, {
                    mimeType: "video/webm",
                });

                mediaRecorder.ondataavailable = (event) => {
                    recordedChunks.push(event.data);
                };

                mediaRecorder.onstop = async () => {
                    const recordedBlob = new Blob(recordedChunks, { type: "video/webm" });
                    const blobUrl = URL.createObjectURL(recordedBlob);
                    window.open(blobUrl);
                    console.log("Blob URL", blobUrl);
                    recordedChunks = [];
                };
                mediaRecorder.start();
                if (focusedTabId) {
                    chrome.tabs.update(focusedTabId, { active: true });
                }
            }
        }
    );
};