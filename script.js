// (function(){})()

class ImageZoomer {

    constructor(props) {
        this.actionName = props.actionName || 'imzoom';

        this.active = false;
        this.timeout = null;
        this.originalImage = null;

        this.scrollUp = {
            enabled: false,
            element: null
        }

        this.imageTop = 0.5;
        this.imageLeft = 0.5;

        this.zoom = 1;
        this.zoomStep = .25;
        this.zoomMax = 2;

        this.start = this.start.bind(this);
        this.mainHandler = this.mainHandler.bind(this);
        this.hide = this.hide.bind(this);
        this.show = this.show.bind(this);
        this.restoreScroll = this.restoreScroll.bind(this);
        this.wheelHandler = this.wheelHandler.bind(this);
        this.zoomHandler = this.zoomHandler.bind(this);
        this.updateZoom = this.updateZoom.bind(this);
        this.moveOverMouse = this.moveOverMouse.bind(this);
        this.updateImage = this.updateImage.bind(this);
        this.setNewPos = this.setNewPos.bind(this);
        this.addScrollUpListener = this.addScrollUpListener.bind(this);

        if (typeof props.scrollUpEl !== 'undefined'
            && props.scrollUpEl instanceof HTMLElement) {
            this.addScrollUpListener(props.scrollUpEl);
        }

        this.init();
    }

    addScrollUpListener(el) {
        this.scrollUp.enabled = true;
        this.scrollUp.element = el;
        window.addEventListener("wheel", this.wheelHandler);
    }

    mainHandler(e) {
        if (e.target.dataset[this.actionName] !== undefined) {
            e.stopPropagation();
            this.start(e.target);
        }
    }

    init() {
        document.body.addEventListener('click', this.mainHandler);
    }


    build(src) {
        const m = document.createElement('div');
        this.magic = m;
        m.id = this.actionName + '-' + Math.floor(Math.random() * 99999) + '-' + Date.now();

        m.style.display = 'none';
        m.style.opacity = '0';
        m.style.position = 'fixed';
        m.style.inset = '0';
        m.style.background = 'hsla(0, 0%, 0%, 0.75)';
        m.style.transition = 'opacity .2s ease-out';

        m.addEventListener('click', e => {
            e.stopPropagation();
            this.hide();
        });

        const im = document.createElement('img');
        this.image = im;
        im.setAttribute('alt', '');

        this.updateSrc(src);


        im.style.position = 'absolute';
        im.style.objectFit = 'contain';
        im.style.transform = 'translate(-50%,-50%)';
        im.style.transition = 'width .2s ease, height .2s ease';
        im.style.willChange = 'left, top, transform';

        m.append(im);

        document.body.append(m);


        return true;
    }

    updateSrc(src) {
        this.image.src = src || '';
    }

    start(el) {
        this.originalImage = el;
        const src = this.getSrc(this.originalImage);

        if (typeof this.magic === 'undefined') {
            this.build(src);
        } else {
            this.updateSrc(src);
        }

        this.placeImage(true)
            .then(this.show)
            .then(this.updateImage);

    }

    moveOverMouse(e) {
        this.setNewPos(e.x, e.y);
    }

    setNewPos(x, y) {
        const [w, h] = [window.innerWidth, window.innerHeight];
        const z = this.zoom;

        const posX = x / w;
        const posY = y / h;

        this.imageLeft = posX + (0.5 - posX) * z;
        this.imageTop = posY + (0.5 - posY) * z;
    }

    updateZoom(deltaY) {
        const step = this.zoomStep;
        const max = this.zoomMax;

        if (deltaY < 0 && this.zoom + step <= max) {
            this.zoom += step;
        } else if (deltaY > 0 && this.zoom > 1) {
            this.zoom -= step;
            if (this.zoom < 1) this.zoom = 1;
        }

        return this.zoom;
    }

    updateImage() {
        return new Promise(resolve => {
            const [ targetLeft, targetTop ] = [ this.imageLeft, this.imageTop ];
            const im = this.image;
            const z = this.zoom;
            const step = .01;

            const imSize = im.getBoundingClientRect();

            const curLeft = (imSize.left + imSize.width / 2) / window.innerWidth;
            let newLeft = curLeft + (targetLeft - curLeft) * step;
            if (newLeft - targetLeft < .001) newLeft = targetLeft;


            im.style.width = (z * 90) + '%';
            im.style.height = (z * 90) + '%';
            im.style.top = (100 * targetTop) + '%';
            im.style.left = (100 * targetLeft) + '%';

            if (this.active === true) {
                this.updaterTimeout = setTimeout(this.updateImage, 20);
            }

            resolve(true);
        })
    }

    hide() {
        return new Promise(resolve => {
            this.active = false;
            window.removeEventListener('wheel', this.zoomHandler);
            window.removeEventListener("mousemove", this.moveOverMouse);
            clearTimeout(this.timeout);
            this.magic.style.opacity = '0';
            this.timeout = setTimeout(() => {
                this.magic.style.display = 'none';
                this.enableScroll();
                this.zoom = 1;

                if (this.isScrollUp) {
                    window.addEventListener("wheel", this.wheelHandler);
                }

                resolve();
            }, 210);
        });
    }

    show() {
        this.active = true;
        window.addEventListener('wheel', this.zoomHandler);
        window.addEventListener("mousemove", this.moveOverMouse);

        return new Promise(resolve => {
            if (this.isScrollUp) {
                window.removeEventListener("wheel", this.wheelHandler);
            }

            clearTimeout(this.timeout);
            this.magic.style.display = 'block';
            this.timeout = setTimeout(() => {
                this.magic.style.opacity = '1';
                this.disableScroll();
                resolve();
            }, 0);
        })
    }

    restoreScroll() {
        window.scrollTo(this.scrollLeft, this.scrollTop);
    }

    disableScroll() {
        // Get the current page scroll position
        this.scrollTop = document.documentElement.scrollTop;
        this.scrollLeft = document.documentElement.scrollLeft;

        window.addEventListener('scroll', this.restoreScroll);
    }

    enableScroll() {
        window.removeEventListener('scroll', this.restoreScroll);
    }

    // Launching zoom view if user scroll up while he is already on the top of page
    wheelHandler(e) {
        const curScrollPos = document.documentElement.scrollTop;
        const isScrollingUp = e.deltaY < 0 ? true : false;

        if (curScrollPos === 0 && isScrollingUp) {
            this.start(this.scrollUp.element);
        }
    }

    // Catching wheel scrolling direction to change zooming value
    zoomHandler(e) {
        if (this.updateZoom(e.deltaY) > 1) {
            this.setNewPos(e.x, e.y);
        } else {
            this.imageLeft = .5;
            this.imageTop = .5;
        }
        // this.updateImage();
    }

    // Zooming image starts moving from the original image postion
    placeImage(firstTime) {
        return new Promise(resolve => {
            firstTime = firstTime ?? false;

            const im = this.image,
                oi = this.originalImage,
                oiSize = oi.getBoundingClientRect();

            im.style.width = oiSize.width + 'px';
            im.style.height = oiSize.height + 'px';
            im.style.top = (oiSize.top + oiSize.height / 2) + 'px';
            im.style.left = (oiSize.left + oiSize.width / 2) + 'px';

            // if (firstTime === true) {
            //     im.style.transition = 'all .2s ease';
            // }

            resolve();
        })
    }

    getSrc(el) {
        let src = el.getAttribute('data-src') ?? el.getAttribute('src');
        if (!src) {
            throw new Error('Image source link not found');
        }
        return src;
    }

    zoomImage() {

    }

    moveImage(x, y) {

    }

    destroy() {
        this.resizeObserver.disconnect();
        document.body.removeEventListener('click', this.mainHandler);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const oi = document.querySelector('.image-n-card .image');
    if (!oi) return false;

    window.imageZoomer = new ImageZoomer({
        actionName: 'imzoom',
        scrollUpEl: oi
    });
});



// window.addEventListener('scroll', () => {placeImage(image, originalImage)})

