const { startRecording } = require('./offscreen');

describe('startRecording', () => {
    beforeEach(() => {
        global.navigator.mediaDevices = {
            getUserMedia: jest.fn(),
        };

        global.chrome = {
            runtime: {
                getURL: jest.fn().mockReturnValue('mockedURL'),
            },
        };

        global.recorder = { state: 'inactive' };
    });

    it('should throw an error if recording is already in progress', async () => {
        global.recorder.state = 'recording';
        await expect(startRecording('testStreamId')).rejects.toThrow('Called startRecording while recording is in progress.');
    });

    it('should call getUserMedia with correct parameters for tabCaptured stream', async () => {
        const mockStream = new MediaStream();
        navigator.mediaDevices.getUserMedia.mockResolvedValueOnce(mockStream);

        await startRecording('testStreamId');

        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
            audio: {
                mandatory: {
                    chromeMediaSource: 'tab',
                    chromeMediaSourceId: 'testStreamId',
                },
            },
            video: {
                mandatory: {
                    chromeMediaSource: 'tab',
                    chromeMediaSourceId: 'testStreamId',
                },
            },
        });
    });

    it('should call getUserMedia for microphone audio', async () => {
        const mockStream = new MediaStream();
        navigator.mediaDevices.getUserMedia.mockResolvedValueOnce(mockStream);
        navigator.mediaDevices.getUserMedia.mockResolvedValueOnce(mockStream);

        await startRecording('testStreamId');

        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
            audio: { echoCancellation: false },
        });
    });
});