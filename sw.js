// Utility function: Get the active tab
const getActiveTab = async () => {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    return tabs.length ? tabs[0] : null;
};

// Utility function: Update recording status
const updateRecording = (state, type) => {
    console.log("Updating recording:", { state, type });
    chrome.storage.local.set({ recording: state, type });
};

// Utility function: Inject script into the current tab
const executeScript = async (scriptOptions) => {
    const tab = await getActiveTab();
    if (tab) {
        scriptOptions.target = { tabId: tab.id };
        await chrome.scripting.executeScript(scriptOptions);
    }
};

// Utility function: Remove camera DOM element
const removeCameraElement = async () => {
    await executeScript({
        func: () => {
            const camera = document.querySelector("#castaCamera");
            if (camera) camera.style.display = "none";
        },
    });
};

// Handle tab activation
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

// Start recording
const startRecording = async (type) => {
    console.log("Starting recording:", type);
    updateRecording(true, type);
    chrome.action.setIcon({ path: "icons/recording.png" });

    if (type === "tab") await handleTabRecording(true);
    else if (type === "screen") await handleScreenRecording();
};

// Stop recording
const stopRecording = async () => {
    console.log("Stopping recording");
    updateRecording(false, "");
    chrome.action.setIcon({ path: "icons/not-recording.png" });
    await handleTabRecording(false);
};

// Handle tab recording
const handleTabRecording = async (start) => {
    const contexts = await chrome.runtime.getContexts({});
    const offscreenDoc = contexts.find((ctx) => ctx.contextType === "OFFSCREEN_DOCUMENT");

    if (!offscreenDoc && start) {
        await chrome.offscreen.createDocument({
            url: "offscreen.html",
            reasons: ["USER_MEDIA", "DISPLAY_MEDIA"],
            justification: "Required for tab recording",
        });
    }

    if (start) {
        const activeTab = await getActiveTab();
        if (!activeTab) return;

        const streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: activeTab.id });
        chrome.runtime.sendMessage({ type: "start-recording", target: "offscreen", data: streamId });
    } else {
        chrome.runtime.sendMessage({ type: "stop-recording", target: "offscreen" });
    }
};

// Handle screen recording
const handleScreenRecording = async () => {
    const screenRecordPath = chrome.runtime.getURL("screenRecord.html");
    const currentTab = await getActiveTab();

    const newTab = await chrome.tabs.create({
        url: screenRecordPath,
        pinned: true,
        active: true,
        index: 0,
    });

    setTimeout(() => {
        chrome.tabs.sendMessage(newTab.id, { type: "start-recording", focusedTabId: currentTab?.id });
    }, 500);
};

// Open tab with video playback
const openTabWithVideo = async ({ url: videoUrl, base64 }) => {
    if (!videoUrl && !base64) return;

    const videoTab = await chrome.tabs.create({ url: chrome.runtime.getURL("video.html") });
    setTimeout(() => {
        chrome.tabs.sendMessage(videoTab.id, { type: "play-video", videoUrl, base64 });
    }, 500);
};

// Listener for runtime messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("Message received:", request);

    (async () => {
        try {
            switch (request.type) {
                case "start-recording":
                    await startRecording(request.recordingType);
                    sendResponse({ success: true }); // Ensure response is sent
                    break;
                case "stop-recording":
                    await stopRecording();
                    sendResponse({ success: true }); // Ensure response is sent
                    break;
                default:
                    console.warn("Unknown request type:", request.type);
                    sendResponse({ success: false, message: "Unknown request type" });
            }
        } catch (error) {
            console.error("Error handling message:", error);
            sendResponse({ success: false, error: error.message }); // Ensure error is sent
        }
    })();

    return true; // Keeps the message channel open for asynchronous response
});
