/**
 * Utility function: Get the active tab
 * @returns {Promise<chrome.tabs.Tab|null>} - The active tab object or null if no active tab is found
 */
const getActiveTab = async () => {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    return tabs.length ? tabs[0] : null;
};

/**
 * Utility function: Update recording status
 * @param {boolean} state - The current recording state (true for active, false for inactive)
 * @param {string} type - The type of recording (e.g., 'tab', 'screen', or '')
 */
const updateRecordingStatus = (state, type) => {
    console.log("Updating recording status:", { state, type });
    chrome.storage.local.set({ recording: state, type });
};

/**
 * Utility function: Inject script into the current tab
 * @param {Object} scriptOptions - Options for the script to execute
 */
const executeScript = async (scriptOptions) => {
    const activeTab = await getActiveTab();
    if (activeTab) {
        scriptOptions.target = { tabId: activeTab.id };
        await chrome.scripting.executeScript(scriptOptions);
    }
};

/**
 * Utility function: Remove camera element from the DOM
 */
const removeCameraElement = async () => {
    await executeScript({
        func: () => {
            const cameraElement = document.querySelector("#castaCamera");
            if (cameraElement) cameraElement.style.display = "none";
        },
    });
};

/**
 * Listener for tab activation events
 * @param {chrome.tabs.TabActiveInfo} activeInfo - Details of the activated tab
 */
chrome.tabs.onActivated.addListener(async (activeInfo) => {
    console.log("Tab activated:", activeInfo);

    const activeTab = await chrome.tabs.get(activeInfo.tabId);
    if (!activeTab || activeTab.url.startsWith("chrome://") || activeTab.url.startsWith("chrome-extension://")) {
        console.log("Exiting due to unsupported tab URL.");
        return;
    }

    const { recording, type } = await chrome.storage.local.get(["recording", "type"]);
    if (recording && type === "screen") {
        await executeScript({ files: ["content.js"] });
    } else {
        await removeCameraElement();
    }
});

/**
 * Starts the recording process
 * @param {string} type - The type of recording (e.g., 'tab' or 'screen')
 */
const startRecording = async (type) => {
    console.log("Starting recording:", type);
    updateRecordingStatus(true, type);
    chrome.action.setIcon({ path: "icons/recording.png" });

    if (type === "tab") {
        await handleTabRecording(true);
    } else if (type === "screen") {
        await handleScreenRecording();
    }
};

/**
 * Stops the recording process
 */
// Stop recording and clean up resources
const stopRecording = async () => {
    console.log("Stopping recording");

    // Update recording status
    updateRecordingStatus(false, "");

    // Reset action icon
    chrome.action.setIcon({ path: "icons/not-recording.png" });

    // Stop tab recording if active
    await handleTabRecording(false);

    // Stop the camera stream
    await stopCameraStream();

    // End tab capture
    await endTabCapture();
};

// Stop the camera stream and remove camera elements
const stopCameraStream = async () => {
    await executeScript({
        func: () => {
            const camera = document.querySelector("#castaCamera");
            if (camera) {
                const videoStream = camera.srcObject;
                if (videoStream) {
                    videoStream.getTracks().forEach((track) => track.stop());
                }
                camera.remove(); // Remove the camera element from the DOM
            }
        },
    });
};

// End the tab capture session
const endTabCapture = async () => {
    try {
        const stream = await chrome.tabCapture.getCapturedTabs();
        if (stream && stream.length > 0) {
            // Stop the tab capture stream
            stream[0].getTracks().forEach((track) => track.stop());
        }
    } catch (error) {
        console.error("Error stopping tab capture:", error);
    }
};


/**
 * Handles tab recording
 * @param {boolean} start - Whether to start or stop the recording
 */
const handleTabRecording = async (start) => {
    const contexts = await chrome.runtime.getContexts({});
    const offscreenDocument = contexts.find((ctx) => ctx.contextType === "OFFSCREEN_DOCUMENT");

    if (!offscreenDocument && start) {
        await chrome.offscreen.createDocument({
            url: "offscreen.html",
            reasons: ["USER_MEDIA", "DISPLAY_MEDIA"],
            justification: "Required for tab recording",
        });
    }

    if (start) {
        const activeTab = await getActiveTab();
        if (!activeTab) return;

        const mediaStreamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: activeTab.id });
        chrome.runtime.sendMessage({ type: "start-recording", target: "offscreen", data: mediaStreamId });
    } else {
        chrome.runtime.sendMessage({ type: "stop-recording", target: "offscreen" });
    }
};

/**
 * Handles screen recording with Full HD resolution
 */
const handleScreenRecording = async () => {
    const screenRecordingUrl = chrome.runtime.getURL("screenRecord.html");
    const currentTab = await getActiveTab();

    const newTab = await chrome.tabs.create({
        url: screenRecordingUrl,
        pinned: true,
        active: true,
        index: 0,
    });

    setTimeout(() => {
        chrome.tabs.sendMessage(newTab.id, {
            type: "start-recording",
            resolution: "1920x1080",
            focusedTabId: currentTab?.id,
        });
    }, 500);
};

/**
 * Opens a new tab to play a recorded video
 * @param {Object} videoData - Video details
 * @param {string} [videoData.url] - URL of the recorded video
 * @param {string} [videoData.base64] - Base64-encoded video data
 */
const openVideoPlaybackTab = async ({ url, base64 }) => {
    if (!url && !base64) return;

    const videoPlaybackTab = await chrome.tabs.create({ url: chrome.runtime.getURL("video.html") });
    setTimeout(() => {
        chrome.tabs.sendMessage(videoPlaybackTab.id, { type: "play-video", videoUrl: url, base64 });
    }, 500);
};

/**
 * Listener for runtime messages
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("Message received:", request);

    (async () => {
        try {
            switch (request.type) {
                case "start-recording":
                    await startRecording(request.recordingType);
                    sendResponse({ success: true });
                    break;
                case "stop-recording":
                    await stopRecording();
                    sendResponse({ success: true });
                    break;
                default:
                    console.warn("Unknown request type:", request.type);
                    sendResponse({ success: false, message: "Unknown request type" });
            }
        } catch (error) {
            console.error("Error handling message:", error);
            sendResponse({ success: false, error: error.message });
        }
    })();

    return true; // Keeps the message channel open for asynchronous response
});