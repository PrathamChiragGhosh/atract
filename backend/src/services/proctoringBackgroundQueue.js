"use strict";

class ProctoringBackgroundQueue {
    constructor() {
        this.queue = [];
        this.isProcessing = false;
    }

    enqueue(handler, meta = {}) {
        if (typeof handler !== "function") {
            throw new Error("Proctoring queue requires a handler function");
        }
        const task = {
            id: meta.id || `proctoring_task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            handler,
            meta,
            enqueuedAt: Date.now()
        };
        this.queue.push(task);
        this.process();
        return task.id;
    }

    async process() {
        if (this.isProcessing) {
            return;
        }
        this.isProcessing = true;

        while (this.queue.length) {
            const task = this.queue.shift();
            try {
                await task.handler();
            } catch (error) {
                console.error("Proctoring queue task failed:", error);
            }
        }

        this.isProcessing = false;
    }
}

module.exports = new ProctoringBackgroundQueue();


