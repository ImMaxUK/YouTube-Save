import EventEmitter from 'events';
import ytdl from 'ytdl-core';

class VideoEventEmitter extends EventEmitter {
    /**
     * 
     * @param {ConstructorParameters<typeof EventEmitter>} options 
     */
    constructor(...options) {
        super(...options);
    }

    /**
     * 
     * @type {Function}
     */
    on(event, listener) {
        super.on(event, listener);
        return this;
    }
}

export default VideoEventEmitter;