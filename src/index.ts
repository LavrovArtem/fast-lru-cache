interface TimelineFrame<K, T> {
    readonly key: K;
    entry: T;
    previous: TimelineFrame<K, T> | null;
    next: TimelineFrame<K, T> | null;
    lastGet: number;
}

class LRUCache<K extends string | number, T> {
    private readonly cacheMap = new Map<K, TimelineFrame<K, T>>();
    private readonly isAutoClear: boolean;
    private firstFrame: TimelineFrame<K, T> | null = null;
    private lastFrame: TimelineFrame<K, T> | null = null;
    private interval: number | null = null;

    constructor(private readonly max = Infinity,
                private readonly unusedTimeout?: number,
                private readonly checkoutInterval?: number) {
        if (isNaN(max) || max < 2 || max !== Math.floor(max) || max === Infinity)
            throw new TypeError(`The max(${max}) attribute is wrong!`);
        
        if (typeof unusedTimeout === 'number') {
            this.isAutoClear = true;
            
            if (isNaN(unusedTimeout) || unusedTimeout < 1 || unusedTimeout === Infinity)
                throw new TypeError(`The unusedTimeout(${unusedTimeout}) attribute is wrong!`);

            if (typeof checkoutInterval !== 'number')
                this.checkoutInterval = unusedTimeout;
            else if (isNaN(checkoutInterval) || checkoutInterval < 1 || checkoutInterval === Infinity)
                throw new TypeError(`The checkoutInterval(${checkoutInterval}) attribute is wrong!`);
        } else
            this.isAutoClear = false;
    }

    get(key: K): T | null {
        const frame = this.cacheMap.get(key);

        if (!frame)
            return null;

        if (this.isAutoClear)
            frame.lastGet = Date.now();

        if (this.firstFrame === frame)
            return frame.entry;

        frame.previous!.next = frame.next;

        if (frame.next)
            frame.next.previous = frame.previous;
        else
            this.lastFrame = frame.previous;

        frame.previous = null;
        frame.next = this.firstFrame;
        this.firstFrame!.previous = frame;
        this.firstFrame = frame;

        return frame.entry;
    }

    set(key: K, entry: T): void {
        if (this.cacheMap.has(key))
            throw new Error(`The provided key(${JSON.stringify(key)}) has already existed!`);

        if (this.cacheMap.size === this.max) {
            this.cacheMap.delete(this.lastFrame!.key);
            this.lastFrame = this.lastFrame!.previous;
            this.lastFrame!.next!.previous = null;
            this.lastFrame!.next = null;
        }

        const frame = {
            key, entry,
            previous: null,
            next: this.firstFrame,
            lastGet: this.isAutoClear ? Date.now() : -1
        } as TimelineFrame<K, T>;

        if (!this.firstFrame) {
            this.lastFrame = frame;

            if (this.isAutoClear)
                this.setInterval();
        } else
            this.firstFrame.previous = frame;
        
        this.firstFrame = frame;

        this.cacheMap.set(key, frame);
    }

    delete (key: K) {
        const frame = this.cacheMap.get(key);

        if (!frame)
            return false;
        
        this.cacheMap.delete(key);

        const nextFrame = frame.next;

        if (nextFrame) {
            nextFrame.previous = frame.previous;
            frame.next = null;
        } else
            this.lastFrame = frame.previous;

        if (frame.previous) {
            frame.previous.next = nextFrame;
            frame.previous = null;
        } else
            this.firstFrame = nextFrame;

        if (!this.cacheMap.size && this.isAutoClear)
            clearInterval(this.interval!);

        return true;
    }

    clear(): void {
        let frame = this.firstFrame;

        if (frame === null)
            return;

        while (frame!.next) {
            this.cacheMap.delete(frame.key);
            frame = frame.next;
            frame.previous!.next = null;
            frame.previous = null;
        }
        
        this.cacheMap.delete(frame.key);
        this.firstFrame = null;
        this.lastFrame = null;

        if (this.isAutoClear)
            clearInterval(this.interval!);
    }

    private setInterval() {
        this.interval = setInterval(() => this.clearUnused(), this.checkoutInterval);

        // @ts-ignore for Node.js
        if (this.interval.unref)
            // @ts-ignore
            this.interval.unref();
    }

    private clearUnused() {
        const deadline = Date.now() - this.unusedTimeout!;
        let frame = this.lastFrame;

        while (frame && frame.lastGet < deadline) {
            const previous = frame.previous;

            if (previous) {
                frame.previous = null;
                previous.next = null;
            }

            this.cacheMap.delete(frame.key);
            frame = previous;
        }

        this.lastFrame = frame;

        if (!frame) {
            this.firstFrame = null;

            if (this.isAutoClear)
                clearInterval(this.interval!);
        }
    }
}

export = LRUCache;
