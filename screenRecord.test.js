const { startScreenRecording } = require('./screenRecord');

describe('startScreenRecording', () => {
    beforeEach(() => {
        global.navigator.mediaDevices = {
            getUserMedia: jest.fn(),
        };

        global.chrome = {
            runtime: {
                onMessage: {
                    addListener: jest.fn(),
                },
            },
        };

        global.MediaStream = jest.fn().mockImplementation((tracks) => ({
            getVideoTracks: jest.fn().mockReturnValue(tracks.filter(track => track.kind === 'video')),
            getAudioTracks: jest.fn().mockReturnValue(tracks.filter(track => track.kind === 'audio')),
        }));

        global.MediaRecorder = jest.fn().mockImplementation(() => ({
            ondataavailable: jest.fn(),
        }));

        global.recorder = { state: 'inactive' };
    });

    it('should call getUserMedia with correct parameters for desktop capture', async () => {
        const mockStream = new MediaStream([{ kind: 'video' }]);
        navigator.mediaDevices.getUserMedia.mockResolvedValueOnce(mockStream);

        await startScreenRecording('testStreamId');

        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
            video: {
                mandatory: {
                    chromeMediaSource: 'desktop',
                    chromeMediaSourceId: 'testStreamId',
                },
            },
        });
    });

    it('should call getUserMedia for microphone audio', async () => {
        const mockStream = new MediaStream([{ kind: 'audio' }]);
        navigator.mediaDevices.getUserMedia.mockResolvedValueOnce(mockStream);
        navigator.mediaDevices.getUserMedia.mockResolvedValueOnce(mockStream);

        await startScreenRecording('testStreamId');

        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
            audio: { echoCancellation: false },
        });
    });

    it('should combine video and audio streams', async () => {
        const mockVideoStream = new MediaStream([{ kind: 'video' }]);
        const mockAudioStream = new MediaStream([{ kind: 'audio' }]);
        navigator.mediaDevices.getUserMedia.mockResolvedValueOnce(mockVideoStream);
        navigator.mediaDevices.getUserMedia.mockResolvedValueOnce(mockAudioStream);

        await startScreenRecording('testStreamId');

        expect(MediaStream).toHaveBeenCalledWith([
            mockVideoStream.getVideoTracks()[0],
            mockAudioStream.getAudioTracks()[0],
        ]);
    });

    it('should create a MediaRecorder with the combined stream', async () => {
        const mockVideoStream = new MediaStream([{ kind: 'video' }]);
        const mockAudioStream = new MediaStream([{ kind: 'audio' }]);
        navigator.mediaDevices.getUserMedia.mockResolvedValueOnce(mockVideoStream);
        navigator.mediaDevices.getUserMedia.mockResolvedValueOnce(mockAudioStream);

        await startScreenRecording('testStreamId');

        expect(MediaRecorder).toHaveBeenCalledWith(expect.any(MediaStream), {
            mimeType: 'video/webm',
        });
    });
});