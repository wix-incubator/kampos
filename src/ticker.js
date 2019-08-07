/**
 * Initialize a ticker instance for batching animation of multiple Kampos instances.
 *
 * @class Ticker
 */
export default class Ticker {
    constructor () {
        this.pool = [];
    }

    /**
     * Starts the animation loop.
     */
    start () {
        if ( ! this.animationFrameId ) {
            const loop = () => {
                this.animationFrameId = window.requestAnimationFrame(loop);
                this.draw();
            };

            this.animationFrameId = window.requestAnimationFrame(loop);
        }
    }

    /**
     * Stops the animation loop.
     */
    stop () {
        window.cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
    }

    /**
     * Invoke draw() on all instances in the pool.
     */
    draw () {
        this.pool.forEach(instance => instance.draw());
    }

    /**
     * Add an instance to the pool.
     *
     * @param {Kampos} instance
     */
    add (instance) {
        const index = this.pool.indexOf(instance);

        if ( ! ~ index ) {
            this.pool.push(instance);
            instance.playing = true;
        }
    }

    /**
     * Remove an instance form the pool.
     *
     * @param {Kampos} instance
     */
    remove (instance) {
        const index = this.pool.indexOf(instance);

        if ( ~ index ) {
            this.pool.splice(index, 1);
            instance.playing = false;
        }
    }
}
